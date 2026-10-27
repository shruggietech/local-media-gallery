# SPDX-License-Identifier: Apache-2.0
"""Small deterministic, source-neutral native media qualification corpus."""
import hashlib
import json
from pathlib import Path
import sys
import struct
from PIL import Image, ImageCms

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
colors = [(220, 20, 20), (20, 220, 20), (20, 20, 220), (220, 220, 20)]
image = Image.new("RGB", (96, 64))
for y in range(64):
    for x in range(96):
        image.putpixel((x, y), colors[(x >= 48) + 2 * (y >= 32)])
rows = []
for fmt, extension in [("PNG", "png"), ("JPEG", "jpg"), ("GIF", "gif"), ("WEBP", "webp"), ("BMP", "bmp"), ("TIFF", "tiff"), ("AVIF", "avif")]:
    name = "quadrants." + extension
    options = {"quality": 100} if fmt in ("JPEG", "WEBP", "AVIF") else {}
    if fmt == "WEBP":
        options["lossless"] = True
    image.save(out / name, format=fmt, **options)
    rows.append({"name": name, "type": "image", "format": fmt, "width": 96, "height": 64, "corners": colors})
orders = [[0, 1, 2, 3], [1, 0, 3, 2], [3, 2, 1, 0], [2, 3, 0, 1], [0, 2, 1, 3], [2, 0, 3, 1], [3, 1, 2, 0], [1, 3, 0, 2]]
for orientation, order in enumerate(orders, 1):
    exif = Image.Exif()
    exif[274] = orientation
    name = f"orientation-{orientation}.jpg"
    image.save(out / name, quality=100, subsampling=0, exif=exif)
    rows.append({"name": name, "type": "image", "format": "JPEG", "orientation": orientation, "width": 96 if orientation <= 4 else 64, "height": 64 if orientation <= 4 else 96, "corners": [colors[i] for i in order]})
profile = bytearray(ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes())
# ICC creation time is descriptive, not color data. Keep synthetic inputs repeatable.
profile[24:36] = struct.pack(">6H", 2026, 1, 1, 0, 0, 0)
profile = bytes(profile)
name = "tagged-srgb.png"
image.save(out / name, icc_profile=profile)
rows.append({"name": name, "type": "image", "format": "PNG", "width": 96, "height": 64, "corners": colors, "profile": {"kind": "sRGB", "sha256": hashlib.sha256(profile).hexdigest()}})
alpha = image.convert("RGBA")
alpha.putpixel((12, 12), (220, 20, 20, 128))
alpha.save(out / "alpha.png")
rows.append({"name": "alpha.png", "type": "image", "format": "PNG", "width": 96, "height": 64, "alpha": {"x": 12, "y": 12, "rgba": [220, 20, 20, 128]}})
Image.new("RGB", (4000, 4), colors[0]).save(out / "panorama.png")
rows.append({"name": "panorama.png", "type": "image", "format": "PNG", "width": 4000, "height": 4})
(out / "damaged.jpg").write_bytes(b"not a decodable image\n")
rows.append({"name": "damaged.jpg", "type": "image", "format": "damaged", "mustFail": True})
(out / "quadrants.png_meta.json").write_text('{"description":"Synthetic qualification item","count":9007199254740993}\n', encoding="utf-8", newline="\n")
(out / "images.json").write_text(json.dumps(rows, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
print(f"Prepared {len(rows)} native image candidates.")
