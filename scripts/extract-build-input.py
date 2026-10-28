# SPDX-License-Identifier: Apache-2.0
"""Extract a previously hash-verified build-tool ZIP without aliases or links."""
import pathlib
import stat
import sys
import zipfile

destination = pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as archive:
    names = set()
    total = 0
    for item in archive.infolist():
        relative = pathlib.PurePosixPath(item.filename)
        if relative.is_absolute() or ".." in relative.parts or "\\" in item.filename or ":" in item.filename:
            raise ValueError("Invalid build input member")
        if item.filename.lower() in names or stat.S_ISLNK(item.external_attr >> 16):
            raise ValueError("Duplicate or redirected build input member")
        names.add(item.filename.lower())
        total += item.file_size
        if total > 1073741824:
            raise ValueError("Build input exceeds bound")
    archive.extractall(destination)
