#!/usr/bin/env python3
"""Generate a small synthetic still-image fixture, never an owner's media."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

root = Path(sys.argv[1]).resolve()
root.mkdir(parents=True, exist_ok=True)
cases = [
    ("image2.jpg", (320, 180)), ("image10.jpg", (180, 320)),
    ("square.png", (200, 200)), ("wide # 100%.webp", (640, 100)),
    ("snow 雪.png", (100, 300)), ("oriented.jpg", (240, 120)),
    ("A equal.jpg", (160, 100)), ("onload=alert(1).webp", (160, 100)),
    ("unsupported.tiff", (80, 80)),
]
for index, (name, size) in enumerate(cases):
    image = Image.new("RGB", size, (20 + index * 18, 70, 110))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, size[0] // 2, size[1] // 2), fill=(230, 170, 60))
    draw.rectangle((size[0] // 2, size[1] // 2, size[0] - 1, size[1] - 1), fill=(40, 190, 160))
    options = {}
    if name == "oriented.jpg":
        exif = Image.Exif()
        exif[274] = 6
        options["exif"] = exif
    image.save(root / name, **options)
(root / "broken.jpg").write_bytes(b"deliberately damaged image fixture\n")
print("Generated eight valid still images, one TIFF and one damaged candidate.")
