# SPDX-License-Identifier: Apache-2.0
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile

reader=Path(__file__).resolve().parents[1]/'scripts/proof-archive.py'
with tempfile.TemporaryDirectory(prefix='lmg-lite-archive-') as temp:
    base=Path(temp);archive=base/'lite.tar.gz';inventory=base/'inventory.json';content=b'payload'
    inventory.write_text(json.dumps([{'path':'local-media-gallery','bytes':'7','sha256':hashlib.sha256(content).hexdigest(),'mode':'755'}]),encoding='utf-8')
    def run(mode=0o755,name='local-media-gallery',kind=tarfile.REGTYPE,duplicate=False):
        with tarfile.open(archive,'w:gz') as out:
            for i in range(2 if duplicate else 1):
                member=tarfile.TarInfo(name);member.type=kind;member.mode=mode;member.size=7 if kind==tarfile.REGTYPE else 0;member.linkname='/outside'
                out.addfile(member,io.BytesIO(content) if member.size else None)
        return subprocess.run([sys.executable,str(reader),'extract',str(archive),str(base/'extracted'),str(inventory)],capture_output=True)
    good=run();assert good.returncode==0,good.stderr
    assert (base/'extracted/local-media-gallery').read_bytes()==content
    for arguments in [{'mode':0o777},{'mode':0o4755},{'name':'../outside'},{'kind':tarfile.SYMTYPE},{'kind':tarfile.LNKTYPE},{'duplicate':True}]:
        result=run(**arguments)
        assert result.returncode!=0, 'Accepted mismatched or unsafe Lite TAR '+str(arguments)
print('Lite TAR reader rejects raw executable mode changes, special bits, links, traversal and duplicates.')
