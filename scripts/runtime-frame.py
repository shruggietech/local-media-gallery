# SPDX-License-Identifier: Apache-2.0
"""Audit a central, control-free video region in an actual native-view snapshot."""
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image

source = Path(sys.argv[1])
assert source.stat().st_size <= 16 * 1024 * 1024
geometry = json.loads(sys.argv[2])
with Image.open(source) as image:
    image.load()
    viewport = geometry["viewport"]
    rect = geometry["rect"]
    scale = min(rect["width"] / geometry["width"], rect["height"] / geometry["height"])
    width = geometry["width"] * scale
    height = geometry["height"] * scale
    left = rect["left"] + (rect["width"] - width) / 2 + width / 4
    top = rect["top"] + (rect["height"] - height) / 2 + height / 4
    right, bottom = left + width / 2, top + height / 2
    assert 0 <= left < right <= viewport["width"]
    assert 0 <= top < bottom <= viewport["height"]
    xscale, yscale = image.width / viewport["width"], image.height / viewport["height"]
    box = tuple(round(value * factor) for value, factor in [(left, xscale), (top, yscale), (right, xscale), (bottom, yscale)])
    region = image.convert("RGB").crop(box)
    colors = region.getcolors(region.width * region.height)
    assert region.width > 8 and region.height > 8 and len(colors) > 8, "Native video snapshot is blank or lacks decoded pattern detail"
    print(json.dumps({"hash": hashlib.sha256(region.tobytes()).hexdigest(), "crop": box, "colors": len(colors), "bitmap": {"width": image.width, "height": image.height}}))
