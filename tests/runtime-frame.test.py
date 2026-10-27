# SPDX-License-Identifier: Apache-2.0
import contextlib
import io
import json
from pathlib import Path
import runpy
import sys
import tempfile
import unittest
from PIL import Image


class NativeFrameTests(unittest.TestCase):
    def observe(self, file, geometry=None):
        geometry = geometry or {"rect": {"left": 0, "top": 0, "width": 64, "height": 64}, "width": 16, "height": 16, "viewport": {"width": 64, "height": 64}}
        previous = sys.argv
        output = io.StringIO()
        try:
            sys.argv = ["runtime-frame.py", str(file), json.dumps(geometry)]
            with contextlib.redirect_stdout(output):
                runpy.run_path("scripts/runtime-frame.py", run_name="__main__")
            return json.loads(output.getvalue())
        finally:
            sys.argv = previous

    def test_blank_and_offscreen_captures_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "frame.png"
            Image.new("RGB", (64, 64)).save(file)
            with self.assertRaises(AssertionError):
                self.observe(file)
            with self.assertRaises(AssertionError):
                self.observe(file, {"rect": {"left": 100, "top": 0, "width": 64, "height": 64}, "width": 16, "height": 16, "viewport": {"width": 64, "height": 64}})

    def test_frame_change_excludes_controls_outside_video_region(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "frame.png"
            image = Image.new("RGB", (64, 64))
            for y in range(64):
                for x in range(64):
                    image.putpixel((x, y), (x * 4, y * 4, 0))
            image.save(file)
            original = self.observe(file)
            self.assertEqual(original["crop"], [16, 16, 48, 48])
            image.putpixel((0, 0), (255, 255, 255))
            image.save(file)
            self.assertEqual(self.observe(file)["hash"], original["hash"])
            image.putpixel((32, 32), (0, 0, 255))
            image.save(file)
            self.assertNotEqual(self.observe(file)["hash"], original["hash"])

    def test_grayscale_activity_cannot_pass_as_the_colored_decoded_fixture(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "spinner.png"
            image = Image.new("RGB", (64, 64))
            for y in range(64):
                for x in range(64):
                    image.putpixel((x, y), (x * 4,) * 3)
            image.save(file)
            with self.assertRaises(AssertionError):
                self.observe(file)

    def test_extra_snapshot_height_does_not_stretch_css_coordinates(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "frame.png"
            image = Image.new("RGB", (64, 80))
            for y in range(80):
                for x in range(64):
                    image.putpixel((x, y), (x * 4, y * 3, 0))
            image.save(file)
            self.assertEqual(self.observe(file)["crop"], [16, 16, 48, 48])


unittest.main()
