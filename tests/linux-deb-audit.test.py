# SPDX-License-Identifier: Apache-2.0
import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile

file=Path(__file__).resolve().parents[1]/'scripts/linux-deb-audit.py'
spec=importlib.util.spec_from_file_location('deb_audit',file)
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
content=b'payload'
def entry(name): return {'path':name,'sha256':hashlib.sha256(content).hexdigest(),'bytes':str(len(content)),'mode':'644'}
def tar(name='usr/bin/app',kind=tarfile.REGTYPE,mode=0o644):
    out=io.BytesIO()
    with tarfile.open(fileobj=out,mode='w:xz') as archive:
        record=tarfile.TarInfo(name);record.type=kind;record.linkname='/outside';record.mode=mode;record.uid=record.gid=0;record.size=len(content) if kind==tarfile.REGTYPE else 0
        archive.addfile(record,io.BytesIO(content) if record.size else None)
    return out.getvalue()
def ar(members):
    raw=b'!<arch>\n'
    for name,data in members:
        raw+=(name+'/').ljust(16).encode()+b'0'.ljust(12)+b'0'.ljust(6)+b'0'.ljust(6)+b'100644'.ljust(8)+str(len(data)).ljust(10).encode()+b'\x60\n'+data+(b'\n' if len(data)%2 else b'')
    return raw
with tempfile.TemporaryDirectory(prefix='lmg-deb-audit-') as tmp:
    package=Path(tmp)/'candidate.deb';inventory={'data':[entry('usr/bin/app')],'control':[entry('control')]}
    base=[('debian-binary',b'2.0\n'),('control.tar.xz',tar('control')),('data.tar.xz',tar())]
    package.write_bytes(ar(base));assert module.audit_deb(package,inventory)=={'dataFiles':1,'controlFiles':1}
    for bad in [tar('../outside'),tar('/outside'),tar('usr/bin/app',tarfile.SYMTYPE),tar('usr/bin/app',tarfile.LNKTYPE),tar('usr/bin/app',mode=0o755)]:
        package.write_bytes(ar(base[:2]+[('data.tar.xz',bad)]))
        try: module.audit_deb(package,inventory)
        except (AssertionError,ValueError): pass
        else: raise AssertionError('Accepted unsafe Debian payload')
    for bad in [ar(base)+b'junk',ar(base+[base[-1]]),ar([('debian-binary',b'1.0\n')]+base[1:])]:
        package.write_bytes(bad)
        try: module.audit_deb(package,inventory)
        except (AssertionError,ValueError): pass
        else: raise AssertionError('Accepted malformed Debian archive')
print('Debian ar/tar readback rejects traversal, links, modes, duplicates and malformed structure before extraction.')
