# Local Media Gallery portable candidate

Browse local photos and videos in a folder and its subfolders. Open **LocalMediaGallery.exe** on Windows x64. On Linux x64 and Apple Silicon macOS, extract the tarball and run `./LocalMediaGallery` from the extracted directory. Use the archive for your operating system and architecture. A current Chrome, Edge, Brave, or Chromium installation provides the gallery window and video decoding. The launcher can also open the default browser.

Place the executable alongside the media, pass a folder as its argument, or select **Open folder** in the toolbar. Linux can use Zenity or KDialog for the native picker. **Folder path** accepts a path on any supported host. Windows may show the normal trust prompt for an unsigned executable. Apple Silicon builds are intended for local candidate review and use Go's default ad-hoc executable signature.

Use grid, tiled, or list view. Search file and folder names, choose a subtree, or filter for photos, videos, or favorites. Open an item to view it, use the arrow keys to move between items, and press Escape to return. **Refresh** discovers additions and removals. The local browser determines which formats and codecs play.

Gallery indexes, favorites, and presentation preferences are kept in a private per-device profile. You can move or share the media folder and rediscover it on another computer. **Settings** includes **Quit Local Media Gallery**. The host also exits after the gallery window closes and stops checking in.

`BUILD.json` identifies the exact source and executable digest. The adjacent SHA-256 file covers the archive.

## Maintainer commands

After `npm ci`, use `node apps/portable/build.mjs native` to build an archive for this host. `node apps/portable/build.mjs all` cross-builds all three targets. The build uses Go 1.26.11 and the platform tar command. Windows cross-packaging also uses Python 3.12 to set Unix executable permissions. Run the extracted-archive smoke test with `node apps/portable/qualify.mjs` after installing Playwright Chromium.
