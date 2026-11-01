# SPDX-License-Identifier: Apache-2.0
"""Read bounded, exact qualification JSON members from a hash-verified CI ZIP."""
import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()
    result = {}
    for name in ("release-assembly.json", "ci-release-validation.json"):
        if names.count(name) != 1:
            raise ValueError("Missing or duplicate qualification member")
        info = archive.getinfo(name)
        if info.file_size > 32 * 1024 * 1024:
            raise ValueError("Qualification JSON exceeds bound")
        result[name] = json.loads(archive.read(name).decode("utf-8"))
    print(json.dumps(result, ensure_ascii=True))
