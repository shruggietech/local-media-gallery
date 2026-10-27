# SPDX-License-Identifier: Apache-2.0
"""Exercise the actual capture policy without starting a desktop screen reader."""
import importlib.util
from pathlib import Path
import sys
import tempfile
import types
import unittest

for name in ["api", "core", "globalPluginHandler", "speech", "speech.extensions", "versionInfo"]:
    sys.modules[name] = types.ModuleType(name)
sys.modules["globalPluginHandler"].GlobalPlugin = object
sys.modules["speech"].extensions = sys.modules["speech.extensions"]
sys.modules["versionInfo"].version = "2026.3"
spec = importlib.util.spec_from_file_location("capture", Path(__file__).resolve().parents[1] / "scripts/nvda-qualification.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CapturePolicy(unittest.TestCase):
    def plugin(self, directory):
        plugin = module.GlobalPlugin.__new__(module.GlobalPlugin)
        plugin.labels = ["Local Media Gallery", "Refresh", "Close folder", "quadrants.png"]
        plugin.records = []
        plugin.overflow = False
        plugin.ready = True
        plugin.path = Path(directory) / "evidence.json"
        return plugin

    def test_queued_unrelated_desktop_speech_is_not_retained(self):
        with tempfile.TemporaryDirectory() as directory:
            plugin = self.plugin(directory)
            self.assertTrue(plugin.gallery_sequence("banner landmark Refresh button "))
            self.assertTrue(plugin.gallery_sequence("quadrants.png dialog"))
            self.assertFalse(plugin.gallery_sequence("PRIVATE_OTHER_WINDOW document"))
            self.assertFalse(plugin.gallery_sequence("PRIVATE_OTHER_WINDOW Refresh button"))

    def test_record_and_byte_bounds_reject_before_storage(self):
        with tempfile.TemporaryDirectory() as directory:
            plugin = self.plugin(directory)
            plugin.append({"kind": "speech", "text": "quadrants.png " * 30000})
            self.assertTrue(plugin.overflow)
            self.assertEqual(plugin.records, [])
            for i in range(257):
                plugin.append({"kind": "speech", "text": "Refresh"})
            self.assertEqual(len(plugin.records), 256)
            self.assertLessEqual(plugin.path.stat().st_size, 262144)


if __name__ == "__main__":
    unittest.main()
