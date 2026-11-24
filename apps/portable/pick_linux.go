// SPDX-License-Identifier: Apache-2.0
//go:build !windows && !darwin

package main

import (
	"context"
	"errors"
	"os/exec"
	"strings"
)

// Uses whichever desktop dialog helper is installed; otherwise the UI's built-in browser is used.
func pickFolder(ctx context.Context, initial string) (string, error) {
	var cmd *exec.Cmd
	if p, err := exec.LookPath("zenity"); err == nil {
		cmd = exec.CommandContext(ctx, p, "--file-selection", "--directory", "--title=Choose A Media Folder", "--filename="+initial+"/")
	} else if p, err := exec.LookPath("kdialog"); err == nil {
		cmd = exec.CommandContext(ctx, p, "--getexistingdirectory", initial, "--title", "Choose A Media Folder")
	} else {
		return "", errPickUnavailable
	}
	out, err := cmd.Output()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) && ee.ExitCode() == 1 && len(ee.Stderr) == 0 {
			return "", nil
		}
		return "", errPickUnavailable
	}
	return strings.TrimSuffix(string(out), "\n"), nil
}
