// SPDX-License-Identifier: Apache-2.0
package main

import (
	"os"
	"path/filepath"
	"testing"
)

func stocked(t *testing.T) (*gallery, asset) {
	t.Helper()
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "sample.png"), []byte("media"), 0600); err != nil {
		t.Fatal(err)
	}
	g, err := openGallery(root, t.TempDir(), "generation")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(g.close)
	g.start()
	<-g.task
	if g.scan.Phase != "ready" || len(g.assets) != 1 {
		t.Fatalf("scan = %+v, assets = %+v", g.scan, g.assets)
	}
	return g, g.assets[0]
}

func TestMediaRequiresTheCurrentFileRevision(t *testing.T) {
	g, item := stocked(t)
	f, _, _, err := g.media(item.ID, item.Revision)
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	if err := os.WriteFile(filepath.Join(g.path, "sample.png"), []byte("changed media"), 0600); err != nil {
		t.Fatal(err)
	}
	if f, _, _, err := g.media(item.ID, item.Revision); err == nil {
		f.Close()
		t.Fatal("served an asset after the observed file changed")
	}
}

func TestFailedRefreshPreservesTheCompleteIndex(t *testing.T) {
	g, item := stocked(t)
	if _, err := g.db.Exec("CREATE TRIGGER reject_assets BEFORE INSERT ON assets BEGIN SELECT RAISE(ABORT, 'test interrupt'); END"); err != nil {
		t.Fatal(err)
	}
	g.start()
	<-g.task
	if g.scan.Phase != "error" || len(g.assets) != 1 || g.assets[0] != item {
		t.Fatalf("scan = %+v, assets = %+v", g.scan, g.assets)
	}
	if err := g.readIndex(); err != nil || len(g.assets) != 1 || g.assets[0] != item {
		t.Fatalf("persistent index = %+v, err = %v", g.assets, err)
	}
}

func TestTwoWindowsMergePreferencePatches(t *testing.T) {
	folder, profile := t.TempDir(), t.TempDir()
	first, err := openGallery(folder, profile, "first")
	if err != nil {
		t.Fatal(err)
	}
	defer first.close()
	second, err := openGallery(folder, profile, "second")
	if err != nil {
		t.Fatal(err)
	}
	defer second.close()
	if _, err := first.updateConfig([]byte(`{"theme":"dark"}`)); err != nil {
		t.Fatal(err)
	}
	cfg, err := second.updateConfig([]byte(`{"view":"list"}`))
	if err != nil || cfg.View != "list" || cfg.Theme != "dark" {
		t.Fatalf("config = %+v, error = %v", cfg, err)
	}
}
