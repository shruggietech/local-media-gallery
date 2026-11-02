# SPDX-License-Identifier: Apache-2.0
import hashlib
import importlib.util
import io
import json
import pathlib
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("linux_source_readback", pathlib.Path(__file__).parents[1] / "scripts/linux-source-readback.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReadbackTests(unittest.TestCase):
    def test_actual_source_tar_and_tamper_refusal(self):
        data = b"exact corresponding source"
        item = {"path": "source.tar.xz", "bytes": str(len(data)), "sha256": hashlib.sha256(data).hexdigest(), "mode": "644"}
        manifest = {"formatVersion": 1, "files": [item], "sources": [{"descriptor": item, "files": [item]}]}
        with tempfile.TemporaryDirectory() as directory:
            for tamper in (False, True):
                archive = pathlib.Path(directory) / (str(tamper) + ".tar.xz")
                with tarfile.open(archive, "w:xz") as output:
                    for name, content in [(item["path"], b"changed" if tamper else data), ("SOURCE-MANIFEST.json", json.dumps(manifest).encode())]:
                        member = tarfile.TarInfo(name)
                        member.size = len(content)
                        output.addfile(member, io.BytesIO(content))
                if tamper:
                    with self.assertRaises(ValueError):
                        module.verify(archive)
                else:
                    self.assertEqual(module.verify(archive)["result"], "pass")


if __name__ == "__main__":
    unittest.main()
