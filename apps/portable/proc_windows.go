// SPDX-License-Identifier: Apache-2.0
//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// hide stops child console tools (ffmpeg) from flashing a window in the GUI-subsystem build.
func hide(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
}
