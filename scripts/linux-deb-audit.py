# SPDX-License-Identifier: Apache-2.0
"""Read-only Debian ar/tar inventory audit before any package extraction."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import sys
import tarfile

MAX_ARCHIVE = 512 * 1024 * 1024

def normal(name):
    assert isinstance(name,str) and name and len(name)<=240
    assert not name.startswith('/') and '\\' not in name and ':' not in name
    assert all(p not in ('','.','..') for p in name.split('/'))
    return name

def expected_files(entries):
    result={}
    assert isinstance(entries,list) and 0<len(entries)<=4097
    for entry in entries:
        name=normal(entry['path'])
        assert name not in result and re.fullmatch('[a-f0-9]{64}',entry['sha256'])
        assert entry['mode'] in ('644','755') and re.fullmatch('0|[1-9][0-9]*',entry['bytes'])
        assert int(entry['bytes'])<=64*1024*1024
        result[name]=entry
    return result

def audit_tar(data,entries):
    expected=expected_files(entries)
    seen=set()
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:*') as archive:
        count=0
        for member in archive:
            count+=1
            assert count<=16384 and member.uid==0 and member.gid==0
            name=member.name.removeprefix('./').rstrip('/')
            if member.isdir():
                if name not in ('','.'): normal(name)
                assert member.mode==0o755
                continue
            name=normal(name)
            assert member.isfile() and name in expected and name not in seen, 'Unlisted/linked/duplicate Debian payload'
            seen.add(name)
            entry=expected[name]
            assert member.size==int(entry['bytes']) and format(member.mode,'o')==entry['mode']
            content=archive.extractfile(member).read(member.size+1)
            assert len(content)==member.size and hashlib.sha256(content).hexdigest()==entry['sha256']
    assert seen==set(expected), 'Incomplete Debian inventory'
    return len(seen)

def audit_deb(file,inventory):
    assert file.stat().st_size<=MAX_ARCHIVE
    raw=file.read_bytes()
    assert raw[:8]==b'!<arch>\n'
    offset=8
    members={}
    while offset<len(raw):
        header=raw[offset:offset+60]
        assert len(header)==60 and header[58:]==b'\x60\n'
        name=header[:16].decode('ascii').strip().removesuffix('/')
        assert name in ('debian-binary','control.tar.xz','data.tar.xz') and name not in members
        size_text=header[48:58].decode('ascii').strip()
        assert re.fullmatch('0|[1-9][0-9]*',size_text)
        size=int(size_text);offset+=60
        assert size<=MAX_ARCHIVE and offset+size<=len(raw)
        members[name]=raw[offset:offset+size];offset+=size
        if size%2:
            assert raw[offset:offset+1]==b'\n';offset+=1
    assert set(members)=={'debian-binary','control.tar.xz','data.tar.xz'} and members['debian-binary']==b'2.0\n'
    assert set(inventory)=={'data','control'}
    return {'dataFiles':audit_tar(members['data.tar.xz'],inventory['data']),'controlFiles':audit_tar(members['control.tar.xz'],inventory['control'])}

if __name__=='__main__':
    print(json.dumps(audit_deb(Path(sys.argv[1]),json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))),separators=(',',':')))
