# SPDX-License-Identifier: Apache-2.0
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from PIL import Image

script = Path(__file__).resolve().parents[1] / 'scripts/linux-package-pixels.py'
with tempfile.TemporaryDirectory(prefix='lmg-native-pixels-') as temp:
    file = Path(temp) / 'native.png'
    image = Image.new('RGB', (1024,800), (20,20,20))
    for y in range(216,408):
        for x in range(260,580):
            image.putpixel((x,y),(120+x%130,10+y%50,20))
    geometry = {'bitmap': {'width':1024,'height':800}, 'video': {'rect': {'x':100,'y':120,'width':640,'height':384}}}
    def measure():
        image.save(file)
        return json.loads(subprocess.check_output([sys.executable,str(script),str(file),json.dumps(geometry)],stdin=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0))
    first=measure()
    assert first['crop']==[260,216,580,408] and first['colors']>8 and first['coloredPixels']>=320*192/4
    for x in range(1024): image.putpixel((x,790),(255,20,20))
    outer=measure()
    assert outer['hash']==first['hash'], 'Changing native control chrome cannot certify changing decoded video'
    image.putpixel((300,300),(1,240,1))
    assert measure()['hash']!=first['hash']
    geometry['video']['rect']['x']=1000
    image.save(file)
    bad=subprocess.run([sys.executable,str(script),str(file),json.dumps(geometry)],stdin=subprocess.DEVNULL,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0)
    assert bad.returncode!=0 and b'AssertionError' in bad.stderr
print('Native package pixel readback rejects clipped geometry and excludes changing control chrome.')
