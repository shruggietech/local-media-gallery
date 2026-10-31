# SPDX-License-Identifier: Apache-2.0
"""Validate a complete ZIP before extracting into a physical retained-input root."""
import pathlib
import re
import shutil
import stat
import zipfile


def validate_archive(archive, max_bytes=1073741824, max_members=200000):
    members = archive.infolist()
    if len(members) > max_members:
        raise ValueError("Archive member count exceeds bound")
    seen = set()
    nodes = {}
    total = 0
    for item in members:
        name = item.orig_filename
        parts = name[:-1].split("/") if name.endswith("/") else name.split("/")
        if any(not p or p in (".", "..") or chr(92) in p or re.search(r'[<>:"\\|?*\x00-\x1f]', p)
               or p.endswith((".", " "))
               or re.match(r"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)", p, re.I)
               for p in parts):
            raise ValueError("Invalid archive member path")
        key = "/".join(parts).casefold()
        mode = item.external_attr >> 16
        if key in seen or stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
            raise ValueError("Duplicate or redirected archive member")
        seen.add(key)
        for index in range(1, len(parts) + 1):
            spelling = "/".join(parts[:index])
            folded = spelling.casefold()
            directory = index < len(parts) or item.is_dir()
            if folded in nodes and nodes[folded] != (spelling, directory):
                raise ValueError("Archive file/directory or case alias")
            nodes[folded] = (spelling, directory)
        total += item.file_size
        if total > max_bytes:
            raise ValueError("Archive expansion exceeds elected bound")
    return members


def redirected(path):
    return path.is_symlink() or getattr(path, "is_junction", lambda: False)()


def extract_verified_zip(source, destination, max_bytes=1073741824):
    destination = pathlib.Path(destination).absolute()
    for parent in (destination, *destination.parents):
        if redirected(parent) or (parent.exists() and not parent.is_dir()):
            raise ValueError("Redirected or non-directory extraction root")
    with zipfile.ZipFile(source) as archive:
        members = validate_archive(archive, max_bytes=max_bytes)
        destination.mkdir(parents=True, exist_ok=True)
        physical = destination.resolve()
        for item in members:
            parts = item.filename.rstrip("/").split("/")
            current = physical
            for part in parts[:-1]:
                current = current / part
                if redirected(current) or (current.exists() and not current.is_dir()):
                    raise ValueError("Redirected archive destination parent")
                current.mkdir(exist_ok=True)
            target = current / parts[-1]
            if redirected(target):
                raise ValueError("Redirected archive destination")
            if item.is_dir():
                target.mkdir(exist_ok=True)
            else:
                if target.exists() and (not target.is_file() or target.stat().st_nlink > 1):
                    raise ValueError("Nonregular or multiply linked archive destination")
                with archive.open(item) as reader, target.open("wb") as writer:
                    shutil.copyfileobj(reader, writer)
