# SPDX-License-Identifier: Apache-2.0
"""Exercise actual ZIP validation and confined extraction without native tools."""
import io
import pathlib
import stat
import tempfile
import unittest
import zipfile

from archive_input import extract_verified_zip, validate_archive


def archive(members):
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as output:
        for name, content in members:
            if isinstance(name, str) and chr(92) in name:
                raw = zipfile.ZipInfo("placeholder")
                raw.filename = name
                name = raw
            output.writestr(name, content)
    data.seek(0)
    return data


class ArchiveInputTests(unittest.TestCase):
    def test_extracts_actual_regular_bytes_and_unicode_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = pathlib.Path(temporary) / "retained"
            extract_verified_zip(archive([("folder/雪.txt", b"exact")]), destination)
            self.assertEqual((destination / "folder/雪.txt").read_bytes(), b"exact")

    def test_refuses_ambiguous_escaping_and_platform_alias_paths(self):
        for name in ("../outside", "/absolute", "./alias", "a//b", "C:/drive", "a\\b", "AUX.txt", "trail."):
            with self.subTest(name=name), zipfile.ZipFile(archive([(name, b"x")])) as source:
                with self.assertRaises(ValueError):
                    validate_archive(source)
        for names in (("A.txt", "a.txt"), ("parent", "parent/child"), ("A/x", "a/y")):
            with self.subTest(names=names), zipfile.ZipFile(archive([(n, b"x") for n in names])) as source:
                with self.assertRaises(ValueError):
                    validate_archive(source)

    def test_refuses_links_and_honors_the_elected_expansion_limit(self):
        link = zipfile.ZipInfo("link")
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        with zipfile.ZipFile(archive([(link, b"outside")])) as source:
            with self.assertRaises(ValueError):
                validate_archive(source)
        with zipfile.ZipFile(archive([("retained", b"12345")])) as source:
            with self.assertRaises(ValueError):
                validate_archive(source, max_bytes=4)
            self.assertEqual(len(validate_archive(source, max_bytes=8)), 1)

    def test_existing_redirected_parent_is_never_followed(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = pathlib.Path(temporary)
            destination = base / "input"
            outside = base / "outside"
            destination.mkdir()
            outside.mkdir()
            try:
                (destination / "redirect").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("Host does not grant test symlink creation")
            with self.assertRaises(ValueError):
                extract_verified_zip(archive([("redirect/file", b"x")]), destination)
            self.assertFalse((outside / "file").exists())


if __name__ == "__main__":
    unittest.main()
