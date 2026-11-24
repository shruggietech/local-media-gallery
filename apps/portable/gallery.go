// SPDX-License-Identifier: Apache-2.0
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type config struct {
	View        string `json:"view"`
	GridSize    int    `json:"gridSize"`
	TileColumns int    `json:"tileColumns"`
	ListSize    int    `json:"listSize"`
	SortKey     string `json:"sortKey"`
	SortDir     string `json:"sortDir"`
	Kind        string `json:"kind"`
	Theme       string `json:"theme"`
	ShowNames   bool   `json:"showNames"`
	Fit         string `json:"fit"`
}

func defaultConfig() config {
	return config{"grid", 220, 0, 56, "name", "asc", "all", "system", false, "cover"}
}

func (c config) valid() bool {
	allowed := func(value string, choices ...string) bool {
		for _, choice := range choices {
			if value == choice {
				return true
			}
		}
		return false
	}
	return allowed(c.View, "grid", "tiled", "list") && c.GridSize >= 100 && c.GridSize <= 400 &&
		c.TileColumns >= 0 && c.TileColumns <= 10 && c.ListSize >= 40 && c.ListSize <= 120 &&
		allowed(c.SortKey, "name", "date", "size", "type", "path") && allowed(c.SortDir, "asc", "desc") &&
		allowed(c.Kind, "all", "image", "video", "favorites") && allowed(c.Theme, "system", "light", "dark") &&
		allowed(c.Fit, "cover", "contain")
}

type asset struct {
	ID       string `json:"id"`
	Path     string `json:"path"`
	Kind     int    `json:"kind"`
	Size     int64  `json:"size"`
	Mtime    int64  `json:"mtime"`
	Revision string `json:"revision"`
	Favorite bool   `json:"fav"`
}

type scanState struct {
	Phase string `json:"phase"`
	Found int    `json:"found"`
	Error string `json:"error,omitempty"`
}

type gallery struct {
	root       *os.Root
	path       string
	db         *sql.DB
	generation string

	mu       sync.RWMutex
	cfg      config
	assets   []asset
	byID     map[string]asset
	scan     scanState
	task     chan struct{}
	cancel   context.CancelFunc
	complete bool
}

const schema = `CREATE TABLE IF NOT EXISTS assets (
	id TEXT PRIMARY KEY, path TEXT NOT NULL, kind INTEGER NOT NULL,
	size INTEGER NOT NULL, mtime INTEGER NOT NULL, revision TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), started INTEGER NOT NULL);`

func openGallery(path, stateDir, generation string) (*gallery, error) {
	path, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	path, err = filepath.EvalSymlinks(path)
	if err != nil {
		return nil, err
	}
	root, err := os.OpenRoot(path)
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(stateDir, fmt.Sprintf("%x", sha256.Sum256([]byte(path))))
	if err := os.MkdirAll(dir, 0700); err != nil {
		root.Close()
		return nil, err
	}
	dbPath := filepath.ToSlash(filepath.Join(dir, "gallery.sqlite"))
	if runtime.GOOS == "windows" {
		dbPath = "/" + dbPath
	}
	dsn := url.URL{Scheme: "file", Path: dbPath, RawQuery: "_pragma=busy_timeout(5000)"}
	db, err := sql.Open("sqlite", dsn.String())
	if err != nil {
		root.Close()
		return nil, err
	}
	db.SetMaxOpenConns(1)
	g := &gallery{root: root, path: path, db: db, generation: generation, cfg: defaultConfig()}
	if _, err := db.Exec(schema); err != nil {
		g.close()
		return nil, err
	}
	if err := g.readIndex(); err != nil {
		g.close()
		return nil, err
	}
	var raw string
	if err := db.QueryRow("SELECT data FROM settings WHERE id=1").Scan(&raw); err == nil {
		saved := defaultConfig()
		if json.Unmarshal([]byte(raw), &saved) == nil && saved.valid() {
			g.cfg = saved
		}
	} else if !errors.Is(err, sql.ErrNoRows) {
		g.close()
		return nil, err
	}
	return g, nil
}

func (g *gallery) close() {
	g.mu.Lock()
	cancel, task := g.cancel, g.task
	g.mu.Unlock()
	if cancel != nil {
		cancel()
		<-task
	}
	g.db.Close()
	g.root.Close()
}

func (g *gallery) setIndex(items []asset) {
	g.assets = items
	g.byID = make(map[string]asset, len(items))
	for _, item := range items {
		g.byID[item.ID] = item
	}
}

func (g *gallery) readIndex() error {
	rows, err := g.db.Query(`SELECT a.id,a.path,a.kind,a.size,a.mtime,a.revision,f.id IS NOT NULL
		FROM assets AS a LEFT JOIN favorites AS f ON a.id=f.id ORDER BY a.path`)
	if err != nil {
		return err
	}
	defer rows.Close()
	items := make([]asset, 0)
	for rows.Next() {
		var item asset
		if err := rows.Scan(&item.ID, &item.Path, &item.Kind, &item.Size, &item.Mtime, &item.Revision, &item.Favorite); err != nil {
			return err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	g.setIndex(items)
	return g.db.QueryRow("SELECT EXISTS(SELECT 1 FROM snapshot)").Scan(&g.complete)
}

var mediaTypes = map[string]string{
	".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".jfif": "image/jpeg",
	".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
	".avif": "image/avif", ".heic": "image/heic", ".bmp": "image/bmp", ".tiff": "image/tiff", ".tif": "image/tiff",
	".svg": "image/svg+xml", ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime",
	".webm": "video/webm", ".ogv": "video/ogg", ".mkv": "video/x-matroska", ".avi": "video/x-msvideo",
}

func revision(info fs.FileInfo) string {
	return strconv.FormatInt(info.ModTime().UnixNano(), 16) + "-" + strconv.FormatInt(info.Size(), 16)
}

func (g *gallery) start() {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.scan.Phase == "discover" {
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	task := make(chan struct{})
	g.task = task
	g.cancel = cancel
	g.scan = scanState{Phase: "discover"}
	started := time.Now().UnixNano()
	go func() {
		defer close(task)
		defer cancel()
		g.refresh(ctx, started)
	}()
}

func (g *gallery) refresh(ctx context.Context, started int64) {
	items := make([]asset, 0)
	err := fs.WalkDir(g.root.FS(), ".", func(path string, entry fs.DirEntry, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			return walkErr
		}
		if path == "." {
			return nil
		}
		if strings.HasPrefix(entry.Name(), ".") || entry.Type()&fs.ModeSymlink != 0 {
			if entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		mime := mediaTypes[strings.ToLower(filepath.Ext(path))]
		if !entry.IsDir() && mime == "" {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if linked(info) {
			if entry.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if entry.IsDir() || !info.Mode().IsRegular() {
			return nil
		}
		kind := 0
		if strings.HasPrefix(mime, "video/") {
			kind = 1
		}
		id := fmt.Sprintf("%x", sha256.Sum256([]byte(path)))
		items = append(items, asset{ID: id, Path: path, Kind: kind, Size: info.Size(), Mtime: info.ModTime().UnixMilli(), Revision: revision(info)})
		if len(items)%64 == 0 {
			g.mu.Lock()
			g.scan.Found = len(items)
			g.mu.Unlock()
		}
		return nil
	})
	g.mu.Lock()
	defer g.mu.Unlock()
	if err == nil {
		err = g.publish(ctx, started, items)
	}
	if err == nil {
		err = g.readIndex()
	}
	if err != nil {
		if !g.complete && len(items) > 0 {
			g.setIndex(items)
		}
		g.scan = scanState{Phase: "error", Found: len(items), Error: err.Error()}
		return
	}
	g.scan = scanState{Phase: "ready", Found: len(g.assets)}
}

func (g *gallery) publish(ctx context.Context, started int64, items []asset) error {
	tx, err := g.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	res, err := tx.ExecContext(ctx, `INSERT INTO snapshot VALUES (1,?)
		ON CONFLICT(id) DO UPDATE SET started=excluded.started WHERE excluded.started > snapshot.started`, started)
	if err != nil {
		return err
	}
	affected, err := res.RowsAffected()
	if err != nil || affected == 0 {
		return err
	}
	if _, err := tx.ExecContext(ctx, "DELETE FROM assets"); err != nil {
		return err
	}
	insert, err := tx.PrepareContext(ctx, "INSERT INTO assets VALUES (?,?,?,?,?,?)")
	if err != nil {
		return err
	}
	defer insert.Close()
	for _, a := range items {
		if _, err := insert.ExecContext(ctx, a.ID, a.Path, a.Kind, a.Size, a.Mtime, a.Revision); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (g *gallery) updateConfig(patch json.RawMessage) (config, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	next := g.cfg
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(patch, &fields); err != nil || fields == nil {
		return g.cfg, errors.New("invalid gallery settings")
	}
	for key, field := range fields {
		switch key {
		case "view", "gridSize", "tileColumns", "listSize", "sortKey", "sortDir", "kind", "theme", "showNames", "fit":
		default:
			return g.cfg, errors.New("invalid gallery setting: " + key)
		}
		if bytes.Equal(field, []byte("null")) {
			return g.cfg, errors.New("invalid gallery settings")
		}
	}
	if err := json.Unmarshal(patch, &next); err != nil || !next.valid() {
		return g.cfg, errors.New("invalid gallery settings")
	}
	data, err := json.Marshal(next)
	if err != nil {
		return g.cfg, err
	}
	var saved string
	err = g.db.QueryRow("INSERT INTO settings VALUES (1,?) ON CONFLICT(id) DO UPDATE SET data=json_patch(settings.data,?) RETURNING data", string(data), string(patch)).Scan(&saved)
	if err != nil {
		return g.cfg, err
	}
	if err := json.Unmarshal([]byte(saved), &next); err != nil {
		return g.cfg, err
	}
	g.cfg = next
	return next, nil
}

func (g *gallery) favorite(id, ver string, value bool) error {
	g.mu.Lock()
	defer g.mu.Unlock()
	item, ok := g.byID[id]
	if !ok || item.Revision != ver {
		return fs.ErrNotExist
	}
	query := "DELETE FROM favorites WHERE id=?"
	if value {
		query = "INSERT OR IGNORE INTO favorites VALUES (?)"
	}
	if _, err := g.db.Exec(query, id); err != nil {
		return err
	}
	item.Favorite = value
	g.byID[id] = item
	for i := range g.assets {
		if g.assets[i].ID == id {
			g.assets[i] = item
			break
		}
	}
	return nil
}

func (g *gallery) media(id, ver string) (*os.File, asset, fs.FileInfo, error) {
	g.mu.RLock()
	a, ok := g.byID[id]
	g.mu.RUnlock()
	if !ok || ver != a.Revision {
		return nil, a, nil, fs.ErrNotExist
	}
	path := filepath.FromSlash(a.Path)
	info, err := g.root.Lstat(path)
	if err != nil || linked(info) || !info.Mode().IsRegular() {
		return nil, a, nil, fs.ErrNotExist
	}
	file, err := g.root.Open(path)
	if err != nil {
		return nil, a, nil, err
	}
	opened, err := file.Stat()
	if err != nil || !opened.Mode().IsRegular() || !os.SameFile(info, opened) || revision(opened) != a.Revision {
		file.Close()
		return nil, a, nil, fs.ErrNotExist
	}
	return file, a, opened, nil
}
