#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Stream and independently verify the retained Ubuntu source distribution."""
import hashlib
import json
import pathlib
import sys
import tarfile


def verify(archive):
    actual = {}
    manifest = None
    with tarfile.open(archive, mode="r|xz") as stream:
        for member in stream:
            name = member.name.removeprefix("./")
            if member.isdir() and name in ("", "."):
                continue
            if not member.isfile() or not name or pathlib.PurePosixPath(name).name != name or name in actual:
                raise ValueError("Non-regular, duplicate or redirected source member")
            content = stream.extractfile(member)
            if content is None:
                raise ValueError("Source member cannot be read")
            digest = hashlib.sha256()
            size = 0
            manifest_chunks = []
            while chunk := content.read(1024 * 1024):
                digest.update(chunk)
                size += len(chunk)
                if name == "SOURCE-MANIFEST.json":
                    if size > 16 * 1024 * 1024:
                        raise ValueError("Source manifest is oversized")
                    manifest_chunks.append(chunk)
            if size != member.size:
                raise ValueError("Source member is truncated")
            actual[name] = {"path": name, "bytes": str(size), "sha256": digest.hexdigest(), "mode": "644"}
            if name == "SOURCE-MANIFEST.json":
                manifest = json.loads(b"".join(manifest_chunks))
    if not manifest or manifest.get("formatVersion") != 1:
        raise ValueError("Source manifest unavailable")
    expected = {item["path"]: item for item in manifest["files"]}
    if len(expected) != len(manifest["files"]):
        raise ValueError("Duplicate source authority")
    if set(actual) != set(expected) | {"SOURCE-MANIFEST.json"}:
        raise ValueError("Missing or uninventoried corresponding source")
    for name, item in expected.items():
        if actual[name] != item:
            raise ValueError("Corresponding source content differs: " + name)
    for source in manifest["sources"]:
        for item in [source["descriptor"], *source["files"]]:
            if actual.get(item["path"]) != item:
                raise ValueError("Source package mapping differs")
    return {"result": "pass", "files": len(actual), "sources": len(manifest["sources"]), "manifest": manifest}


if __name__ == "__main__":
    print(json.dumps(verify(sys.argv[1]), separators=(",", ":")))
