# SPDX-License-Identifier: Apache-2.0
"""Independent Pillow readback of actual isolated X11 package snapshots."""
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image

file = Path(sys.argv[1])
assert file.stat().st_size <= 16 * 1024 * 1024
observation = json.loads(sys.argv[2])
with Image.open(file) as source:
    source.load()
    image = source.convert('RGB')
    assert image.width == observation['bitmap']['width'] and image.height == observation['bitmap']['height']
    colors = image.getcolors(image.width * image.height)
    result = {'pixels': {'red': sum(n for n, (r,g,b) in colors if r > 150 and g < 70 and b < 70), 'green': sum(n for n, (r,g,b) in colors if g > 150 and r < 70 and b < 70)}, 'bitmap': observation['bitmap']}
    if 'video' in observation:
        rect = observation['video']['rect']
        assert rect and rect['width'] > 0 and rect['height'] > 0
        scale = min(rect['width']/160, rect['height']/96)
        width, height = 160*scale, 96*scale
        left, top = rect['x']+(rect['width']-width)/2, rect['y']+(rect['height']-height)/2
        crop = [round(left+width/4), round(top+height/4), round(left+3*width/4), round(top+3*height/4)]
        assert 0 <= crop[0] < crop[2] <= image.width and 0 <= crop[1] < crop[3] <= image.height
        region = image.crop(crop)
        colors = region.getcolors(region.width*region.height)
        result.update({'hash': hashlib.sha256(region.tobytes()).hexdigest(), 'crop': crop, 'colors': len(colors), 'coloredPixels': sum(n for n, rgb in colors if max(rgb)>80 and max(rgb)-min(rgb)>60)})
print(json.dumps(result, separators=(',',':')))
