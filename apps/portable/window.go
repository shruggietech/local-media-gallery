// SPDX-License-Identifier: Apache-2.0
package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

type appWindow struct {
	profile string
	process *os.Process
	done    chan struct{}
}

func (w *appWindow) cleanup() {
	w.process.Kill()
	select {
	case <-w.done:
	case <-time.After(2 * time.Second):
	}
	for i := 0; i < 4; i++ {
		if os.RemoveAll(w.profile) == nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
}

func browserCandidates() []string {
	switch runtime.GOOS {
	case "windows":
		var result []string
		for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LocalAppData"} {
			base := os.Getenv(env)
			if base != "" {
				for _, browser := range []string{"Microsoft/Edge/Application/msedge.exe", "Google/Chrome/Application/chrome.exe", "BraveSoftware/Brave-Browser/Application/brave.exe", "Chromium/Application/chrome.exe"} {
					result = append(result, filepath.Join(base, browser))
				}
			}
		}
		return result
	case "darwin":
		return []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
			"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
			"/Applications/Chromium.app/Contents/MacOS/Chromium",
		}
	default:
		var result []string
		for _, name := range []string{"google-chrome", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"} {
			if found, err := exec.LookPath(name); err == nil {
				result = append(result, found)
			}
		}
		return result
	}
}

func openAppWindow(address string) (*appWindow, error) {
	for _, browser := range browserCandidates() {
		if info, err := os.Stat(browser); err != nil || info.IsDir() {
			continue
		}
		profile, err := os.MkdirTemp("", "lmg-browser-")
		if err != nil {
			break
		}
		cmd := exec.Command(browser, "--app="+address, "--user-data-dir="+profile,
			"--no-first-run", "--no-default-browser-check", "--disable-sync",
			"--disable-background-networking", "--disable-component-update", "--disable-background-mode")
		if err := cmd.Start(); err != nil {
			os.RemoveAll(profile)
			continue
		}
		window := &appWindow{profile: profile, process: cmd.Process, done: make(chan struct{})}
		go func() {
			cmd.Wait()
			close(window.done)
		}()
		return window, nil
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", address)
		hide(cmd)
	case "darwin":
		cmd = exec.Command("/usr/bin/open", address)
	default:
		cmd = exec.Command("xdg-open", address)
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	go cmd.Wait()
	return nil, nil
}
