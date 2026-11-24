# SPDX-License-Identifier: Apache-2.0
"""Write a Unix archive from Windows build staging."""

import pathlib
import sys
import tarfile


def pack(source: pathlib.Path, output: pathlib.Path, executable: str) -> None:
    with tarfile.open(output, "w:gz") as archive:
        for file in sorted(source.rglob("*")):
            if not file.is_file():
                continue
            name = file.relative_to(source).as_posix()
            info = archive.gettarinfo(str(file), name)
            info.mode = 0o755 if name == executable else 0o644
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            with file.open("rb") as data:
                archive.addfile(info, data)


if __name__ == "__main__":
    pack(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3])
