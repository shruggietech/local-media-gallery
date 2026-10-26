# SPDX-License-Identifier: Apache-2.0
"""Verify pinned comparison pixels without replacing their host-specific PNG encoding.

The recovered verifier recomputes comparison images while checking the manifest.
PNG compressors can encode identical pixels differently across native wheels.
This adapter changes only saves to the 128 checksum-verified comparison files in
an isolated kit copy. Every mode, dimension and pixel must match the pinned image.
The exact recovered verifier still checks its report, approval and every manifest
hash. Installed kit bytes and recovered verifier source remain unchanged.
"""
import hashlib
import io
import json
import os
import pathlib
import runpy
import sys
from PIL import Image


def pinned_comparison_save(original, expected, report):
    def save(image, destination, format=None, **parameters):
        if not isinstance(destination, (str, bytes, os.PathLike)):
            return original(image, destination, format=format, **parameters)
        path = pathlib.Path(os.fsdecode(destination)).resolve()
        pinned = expected.get(path)
        if pinned is None:
            return original(image, destination, format=format, **parameters)
        if path.read_bytes() != pinned:
            raise ValueError("Pinned comparison bytes changed before verification")
        with Image.open(io.BytesIO(pinned)) as reference:
            reference.load()
            if image.mode != reference.mode or image.size != reference.size or image.tobytes() != reference.tobytes():
                raise ValueError("Comparison pixels, dimensions or mode differ from the pinned image: " + path.name)
        report.append({"path": str(path), "sha256": hashlib.sha256(pinned).hexdigest(), "result": "exact-pixels-pinned-encoding"})
        # The original compressed representation is already present and checked.
        return None
    return save


def main():
    verifier = pathlib.Path(sys.argv[1]).resolve()
    kit = pathlib.Path(sys.argv[2]).resolve()
    manifest = json.loads((kit / "manifest.json").read_text(encoding="utf-8"))
    expected = {}
    prefix = "qc/identity-continuity-proofs/comparisons/"
    for entry in manifest["files"]:
        if not entry["path"].startswith(prefix) or not entry["path"].endswith(".png"):
            continue
        path = (kit / entry["path"]).resolve()
        if not path.is_relative_to(kit) or path.is_symlink():
            raise ValueError("Comparison leaves the isolated kit")
        data = path.read_bytes()
        if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
            raise ValueError("Pinned comparison inventory drift")
        expected[path] = data
    if len(expected) != 128:
        raise ValueError("Expected the complete pinned 32-by-4 comparison matrix")
    report = []
    original = Image.Image.save
    Image.Image.save = pinned_comparison_save(original, expected, report)
    sys.path.insert(0, str(verifier.parent))
    sys.argv = [str(verifier), str(kit)]
    try:
        try:
            runpy.run_path(str(verifier), run_name="__main__")
        except SystemExit as result:
            if result.code not in (None, 0):
                raise
        if len(report) != len(expected) or {entry["path"] for entry in report} != {str(path) for path in expected}:
            raise ValueError("Verifier did not recompute every pinned comparison")
    finally:
        Image.Image.save = original
        for entry in report:
            entry["path"] = pathlib.Path(entry["path"]).relative_to(kit).as_posix()
        (kit.parent / "comparison-pixel-verification.json").write_text(json.dumps({"basis": "exact mode/dimensions/pixels; pinned compressed bytes retained", "comparisons": report}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
