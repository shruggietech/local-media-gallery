# SPDX-License-Identifier: Apache-2.0
"""Extract hash-verified CI evidence, including retained native recovery inventories."""
import sys

from archive_input import extract_verified_zip

# Accepted Windows campaigns already retain about 1.4 GB of expanded evidence.
# This limit belongs to CI evidence; the smaller build-tool limit is unchanged.
extract_verified_zip(sys.argv[1], sys.argv[2], max_bytes=4 * 1024 * 1024 * 1024)
