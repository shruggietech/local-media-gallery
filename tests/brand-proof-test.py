# SPDX-License-Identifier: Apache-2.0
"""Cross-host compression must not change or excuse a comparison image."""
import importlib.util
import pathlib
import tempfile
import unittest
from PIL import Image

spec = importlib.util.spec_from_file_location("brand_proof", pathlib.Path(__file__).resolve().parents[1] / "scripts/brand-proof-verify.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ComparisonEncodingTests(unittest.TestCase):
    def test_identical_pixels_keep_exact_pinned_compressed_bytes(self):
        with tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).resolve().parents[1] / ".local") as temporary:
            path = pathlib.Path(temporary) / "comparison.png"
            image = Image.new("RGBA", (16, 16), (12, 34, 56, 255))
            image.save(path, compress_level=9)
            expected = path.read_bytes()
            original = Image.Image.save
            report = []
            adapter = module.pinned_comparison_save(original, {path.resolve(): expected}, report)
            adapter(image, path, compress_level=0)
            self.assertEqual(path.read_bytes(), expected)
            self.assertEqual(len(report), 1)
            self.assertEqual(report[0]["result"], "exact-pixels-pinned-encoding")

    def test_changed_pixel_is_rejected_without_rewriting_pinned_file(self):
        with tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).resolve().parents[1] / ".local") as temporary:
            path = pathlib.Path(temporary) / "comparison.png"
            image = Image.new("RGBA", (16, 16), (0, 0, 0, 255))
            image.save(path)
            expected = path.read_bytes()
            image.putpixel((8, 8), (1, 0, 0, 255))
            adapter = module.pinned_comparison_save(Image.Image.save, {path.resolve(): expected}, [])
            with self.assertRaisesRegex(ValueError, "Comparison pixels"):
                adapter(image, path)
            self.assertEqual(path.read_bytes(), expected)

    def test_changed_size_or_mode_is_rejected(self):
        with tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).resolve().parents[1] / ".local") as temporary:
            path = pathlib.Path(temporary) / "comparison.png"
            Image.new("RGBA", (16, 16)).save(path)
            adapter = module.pinned_comparison_save(Image.Image.save, {path.resolve(): path.read_bytes()}, [])
            for image in [Image.new("RGBA", (8, 8)), Image.new("RGB", (16, 16))]:
                with self.assertRaisesRegex(ValueError, "Comparison pixels"):
                    adapter(image, path)

    def test_unlisted_output_uses_the_original_encoder(self):
        with tempfile.TemporaryDirectory(dir=pathlib.Path(__file__).resolve().parents[1] / ".local") as temporary:
            path = pathlib.Path(temporary) / "unlisted.png"
            adapter = module.pinned_comparison_save(Image.Image.save, {}, [])
            adapter(Image.new("RGB", (4, 4)), path)
            with Image.open(path) as actual:
                self.assertEqual(actual.size, (4, 4))

if __name__ == "__main__":
    unittest.main()
