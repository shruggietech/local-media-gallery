// SPDX-License-Identifier: Apache-2.0
package main

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type server struct {
	address  string
	token    string
	stateDir string
	static   fs.FS
	done     chan struct{}
	lastPing atomic.Int64

	switchMu sync.Mutex
	mu       sync.RWMutex
	active   *gallery
	openErr  string
}

type state struct {
	Generation string    `json:"generation"`
	Root       string    `json:"root"`
	Config     config    `json:"config"`
	Scan       scanState `json:"scan"`
	Assets     []asset   `json:"assets,omitempty"`
}

func (s *server) changeGallery(path, expected string) error {
	s.switchMu.Lock()
	defer s.switchMu.Unlock()
	s.mu.RLock()
	old := s.active
	s.mu.RUnlock()
	if old != nil && expected != old.generation {
		return errStale
	}
	next, err := openGallery(path, s.stateDir, rand.Text())
	if err != nil {
		return err
	}
	next.start()
	s.mu.Lock()
	s.active, s.openErr = next, ""
	s.mu.Unlock()
	if old != nil {
		old.close()
	}
	return nil
}

func (s *server) close() {
	s.switchMu.Lock()
	defer s.switchMu.Unlock()
	s.mu.Lock()
	current := s.active
	s.active = nil
	s.mu.Unlock()
	if current != nil {
		current.close()
	}
}

func (s *server) snapshot(withItems bool) state {
	s.mu.RLock()
	defer s.mu.RUnlock()
	g := s.active
	if g == nil {
		return state{Config: defaultConfig(), Scan: scanState{Phase: "closed", Error: s.openErr}}
	}
	g.mu.RLock()
	defer g.mu.RUnlock()
	result := state{Generation: g.generation, Root: g.path, Config: g.cfg, Scan: g.scan}
	if withItems {
		result.Assets = append([]asset(nil), g.assets...)
	}
	return result
}

func writeJSON(w http.ResponseWriter, code int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(value)
}

func failure(w http.ResponseWriter, code int, err error) {
	writeJSON(w, code, map[string]string{"error": err.Error()})
}

func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 65536)).Decode(v); err != nil {
		failure(w, http.StatusBadRequest, errors.New("invalid request"))
		return false
	}
	return true
}

var errStale = errors.New("this gallery has been replaced")
var errPickUnavailable = errors.New("native folder picker unavailable")

func (s *server) routes() http.Handler {
	sessionCookie := "lmg_portable_" + strings.TrimPrefix(s.address, "127.0.0.1:")
	mux := http.NewServeMux()
	mux.HandleFunc("GET /start/{token}", func(w http.ResponseWriter, r *http.Request) {
		if !s.matches(r.PathValue("token")) {
			http.NotFound(w, r)
			return
		}
		http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: s.token, Path: "/", HttpOnly: true, SameSite: http.SameSiteStrictMode})
		s.lastPing.Store(time.Now().UnixNano())
		http.Redirect(w, r, "/", http.StatusSeeOther)
	})
	mux.HandleFunc("GET /api/state", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, s.snapshot(true))
	})
	mux.HandleFunc("GET /api/status", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, s.snapshot(false))
	})
	mux.HandleFunc("POST /api/open", func(w http.ResponseWriter, r *http.Request) {
		var request struct{ Path, Generation string }
		if !decode(w, r, &request) {
			return
		}
		if request.Path == "" {
			failure(w, http.StatusBadRequest, errors.New("choose a folder"))
			return
		}
		if err := s.changeGallery(request.Path, request.Generation); err != nil {
			code := http.StatusBadRequest
			if errors.Is(err, errStale) {
				code = http.StatusConflict
			}
			failure(w, code, err)
			return
		}
		writeJSON(w, http.StatusOK, s.snapshot(true))
	})
	mux.HandleFunc("POST /api/pick", func(w http.ResponseWriter, r *http.Request) {
		current := s.snapshot(false)
		initial := current.Root
		if initial == "" {
			initial, _ = os.UserHomeDir()
		}
		path, err := pickFolder(r.Context(), initial)
		if err != nil {
			code := http.StatusInternalServerError
			if errors.Is(err, errPickUnavailable) {
				code = http.StatusNotImplemented
			}
			failure(w, code, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"path": path})
	})
	mux.HandleFunc("POST /api/gallery/{gallery}/refresh", s.galleryRoute(func(w http.ResponseWriter, r *http.Request, g *gallery) {
		g.start()
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("PUT /api/gallery/{gallery}/config", s.galleryRoute(func(w http.ResponseWriter, r *http.Request, g *gallery) {
		var patch json.RawMessage
		if !decode(w, r, &patch) {
			return
		}
		value, err := g.updateConfig(patch)
		if err != nil {
			failure(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, value)
	}))
	mux.HandleFunc("POST /api/gallery/{gallery}/favorite", s.galleryRoute(func(w http.ResponseWriter, r *http.Request, g *gallery) {
		var request struct {
			ID, Revision string
			Value        bool
		}
		if !decode(w, r, &request) {
			return
		}
		if err := g.favorite(request.ID, request.Revision, request.Value); err != nil {
			code := http.StatusInternalServerError
			if errors.Is(err, fs.ErrNotExist) {
				code = http.StatusConflict
			}
			failure(w, code, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	mux.HandleFunc("GET /media/{gallery}/{id}/{revision}", s.serveMedia)
	mux.HandleFunc("POST /api/ping", func(w http.ResponseWriter, r *http.Request) {
		s.lastPing.Store(time.Now().UnixNano())
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/quit", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
		select {
		case s.done <- struct{}{}:
		default:
		}
	})
	mux.Handle("/", http.FileServer(http.FS(s.static)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; object-src 'none'")
		if r.Host != s.address || !s.allowOrigin(r) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/media/") {
			cookie, err := r.Cookie(sessionCookie)
			if err != nil || !s.matches(cookie.Value) {
				http.Error(w, "Open the gallery using its launcher", http.StatusUnauthorized)
				return
			}
		}
		mux.ServeHTTP(w, r)
	})
}

func (s *server) matches(value string) bool {
	return subtle.ConstantTimeCompare([]byte(s.token), []byte(value)) == 1
}

func (s *server) allowOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	return origin == "" || origin == "http://"+s.address
}

func (s *server) galleryRoute(f func(http.ResponseWriter, *http.Request, *gallery)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.mu.RLock()
		defer s.mu.RUnlock()
		g := s.active
		if g == nil || g.generation != r.PathValue("gallery") {
			failure(w, http.StatusConflict, errStale)
			return
		}
		f(w, r, g)
	}
}

func (s *server) serveMedia(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	g := s.active
	if g == nil || g.generation != r.PathValue("gallery") {
		s.mu.RUnlock()
		http.NotFound(w, r)
		return
	}
	file, a, info, err := g.media(r.PathValue("id"), r.PathValue("revision"))
	s.mu.RUnlock()
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	w.Header().Set("Content-Type", mediaTypes[strings.ToLower(filepath.Ext(a.Path))])
	w.Header().Set("Content-Security-Policy", "sandbox; default-src 'none'")
	http.ServeContent(w, r, filepath.Base(a.Path), info.ModTime(), file)
}

func (s *server) launchURL() string {
	return fmt.Sprintf("http://%s/start/%s", s.address, s.token)
}
