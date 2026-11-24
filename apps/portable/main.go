// SPDX-License-Identifier: Apache-2.0
package main

import (
	"context"
	"crypto/rand"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

var sourceRevision = "working-tree"

//go:embed all:ui/dist
var ui embed.FS

func main() {
	version := flag.Bool("version", false, "print the source revision")
	noOpen := flag.Bool("no-open", false, "serve the gallery and print its launch address")
	flag.Usage = func() {
		fmt.Fprintln(flag.CommandLine.Output(), "Usage: LocalMediaGallery [--no-open] [folder]")
		flag.PrintDefaults()
	}
	flag.Parse()
	if *version {
		fmt.Println("Local Media Gallery portable candidate", sourceRevision)
		return
	}
	if flag.NArg() > 1 {
		flag.Usage()
		os.Exit(2)
	}
	folder := flag.Arg(0)
	if folder == "" {
		exe, err := os.Executable()
		if err != nil {
			exit(err)
		}
		folder = filepath.Dir(exe)
	}
	if err := run(folder, *noOpen); err != nil {
		exit(err)
	}
}

func run(folder string, noOpen bool) error {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	content, err := fs.Sub(ui, "ui/dist")
	if err != nil {
		return err
	}
	ln, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		return err
	}
	defer ln.Close()
	s := &server{address: ln.Addr().String(), token: rand.Text(), stateDir: filepath.Join(cfg, "local-media-gallery-portable"), static: content, done: make(chan struct{}, 1)}
	defer s.close()
	if err := s.changeGallery(folder, ""); err != nil {
		s.openErr = err.Error()
	}
	host := &http.Server{Handler: s.routes(), ReadHeaderTimeout: 5 * time.Second}
	terminated := make(chan error, 1)
	go func() { terminated <- host.Serve(ln) }()
	var windowClosed <-chan struct{}
	if noOpen {
		fmt.Println(s.launchURL())
	} else {
		window, err := openAppWindow(s.launchURL())
		if err != nil {
			return err
		}
		if window != nil {
			windowClosed = window.done
			defer window.cleanup()
		}
	}
	sig, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	tick := time.NewTicker(2 * time.Second)
	defer tick.Stop()
	started := time.Now()
	lastTick := started
	for {
		select {
		case err := <-terminated:
			if !errors.Is(err, http.ErrServerClosed) {
				return err
			}
			return nil
		case <-sig.Done():
		case <-s.done:
		case <-windowClosed:
		case now := <-tick.C:
			if noOpen {
				continue
			}
			last := s.lastPing.Load()
			slept := now.Sub(lastTick) > 15*time.Second
			lastTick = now
			if slept && last != 0 {
				s.lastPing.Store(now.UnixNano())
				continue
			}
			if last == 0 && now.Sub(started) < 2*time.Minute || last != 0 && now.Sub(time.Unix(0, last)) < 2*time.Minute {
				continue
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		err := host.Shutdown(ctx)
		cancel()
		if err != nil {
			host.Close()
		}
		return nil
	}
}

func exit(err error) {
	fmt.Fprintln(os.Stderr, "Local Media Gallery:", err)
	os.Exit(1)
}
