# SPDX-License-Identifier: Apache-2.0
"""Deterministic owned proof archives and inventory-checked extraction."""
import gzip
import io
import json
import pathlib
import stat
import sys
import tarfile
import zipfile

mode, archive_name, directory_name, inventory_name = sys.argv[1:]
archive = pathlib.Path(archive_name)
directory = pathlib.Path(directory_name).resolve()
entries = json.loads(pathlib.Path(inventory_name).read_text(encoding="utf-8"))
expected = {entry["path"]: entry for entry in entries}
if len(expected) != len(entries):
    raise ValueError("Duplicate payload entry")
for name in expected:
    parts = pathlib.PurePosixPath(name)
    if not name or parts.is_absolute() or ".." in parts.parts or "\\" in name or ":" in name:
        raise ValueError("Unsafe payload entry")
    target = directory.joinpath(*parts.parts).resolve()
    if not target.is_relative_to(directory):
        raise ValueError("Payload leaves owned directory")
if mode == "create":
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as out:
            for name, entry in expected.items():
                file = directory.joinpath(*pathlib.PurePosixPath(name).parts)
                info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | int(entry["mode"] or "644", 8)) << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                out.writestr(info, file.read_bytes(), compresslevel=9)
    else:
        with archive.open("wb") as raw, gzip.GzipFile(fileobj=raw, filename="", mode="wb", mtime=0) as compressed, tarfile.open(fileobj=compressed, mode="w") as out:
            for name, entry in expected.items():
                data = directory.joinpath(*pathlib.PurePosixPath(name).parts).read_bytes()
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = int(entry["mode"] or "644", 8)
                info.mtime = 0
                out.addfile(info, io.BytesIO(data))
elif mode == "extract":
    directory.mkdir(parents=True, exist_ok=True)
    if archive.suffix == ".zip":
        with zipfile.ZipFile(archive) as source:
            members = source.infolist()
            if len(members) != len(expected) or {m.filename for m in members} != set(expected):
                raise ValueError("Archive inventory mismatch")
            for member in members:
                raw_mode = member.external_attr >> 16
                expected_mode = expected[member.filename]["mode"]
                if member.is_dir() or stat.S_IFMT(raw_mode) not in (0, stat.S_IFREG) or member.file_size != int(expected[member.filename]["bytes"]) or (expected_mode is not None and stat.S_IMODE(raw_mode) != int(expected_mode, 8)):
                    raise ValueError("Archive member type, size or raw mode mismatch")
            source.extractall(directory)
            for member in members:
                expected_mode = expected[member.filename]["mode"]
                if expected_mode is not None:
                    directory.joinpath(*pathlib.PurePosixPath(member.filename).parts).chmod(int(expected_mode, 8))
    else:
        with tarfile.open(archive, "r:gz") as source:
            members = source.getmembers()
            if len(members) != len(expected) or {m.name for m in members} != set(expected):
                raise ValueError("Archive inventory mismatch")
            for member in members:
                if not member.isfile() or member.size != int(expected[member.name]["bytes"]) or (expected[member.name]["mode"] is not None and member.mode != int(expected[member.name]["mode"], 8)):
                    raise ValueError("Archive member type, size or raw mode mismatch")
            source.extractall(directory, filter="data")
else:
    raise ValueError("Unknown archive operation")
