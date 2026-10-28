# SPDX-License-Identifier: Apache-2.0
"""Independent PNG decoding of ordinary macOS candidate native window frames."""
import json
import sys
from pathlib import Path
from PIL import Image

for name in sys.argv[1:]:
    file = Path(name)
    assert 0 < file.stat().st_size <= 32 * 1024 * 1024
    with Image.open(file) as image:
        image.load()
        assert image.width > 100 and image.height > 100
        pixels = list(image.convert("RGB").getdata())
        red = sum(r > 165 and g < 64 and b < 64 for r, g, b in pixels)
        green = sum(g > 153 and r < 77 and b < 77 for r, g, b in pixels)
        color = "green" if file.name.endswith("-green.png") else "red"
        assert {"red": red, "green": green}[color] > 1500, "Missing known native fixture pixels"
        print(json.dumps({"file": str(file), "width": image.width, "height": image.height, "red": red, "green": green}))
