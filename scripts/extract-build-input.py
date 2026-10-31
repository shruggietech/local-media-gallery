# SPDX-License-Identifier: Apache-2.0
"""Extract a previously hash-verified build-tool ZIP within its existing 1 GiB bound."""
import sys

from archive_input import extract_verified_zip

extract_verified_zip(sys.argv[1], sys.argv[2])
