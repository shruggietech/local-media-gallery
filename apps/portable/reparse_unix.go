// SPDX-License-Identifier: Apache-2.0
//go:build !windows

package main

import "io/fs"

func linked(info fs.FileInfo) bool { return info.Mode()&fs.ModeSymlink != 0 }
