// SPDX-License-Identifier: Apache-2.0
//go:build darwin

package main

import (
	"context"
	"errors"
	"os/exec"
	"strings"
)

func pickFolder(ctx context.Context, initial string) (string, error) {
	script := `POSIX path of (choose folder with prompt "Choose A Media Folder" default location (POSIX file "` +
		strings.ReplaceAll(strings.ReplaceAll(initial, `\`, `\\`), `"`, `\"`) + `"))`
	out, err := exec.CommandContext(ctx, "/usr/bin/osascript", "-e", script).Output()
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) && strings.Contains(string(ee.Stderr), "(-128)") {
			return "", nil // cancelled (-128)
		}
		return "", errPickUnavailable
	}
	return strings.TrimSuffix(string(out), "\n"), nil
}
