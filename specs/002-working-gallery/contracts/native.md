# S002 native contract

## Entry

local-media-gallery accepts zero/one directory, --help, --version and --. Explicit relative paths resolve against the invocation directory; no path opens a selection state. Invalid options/multiple paths exit 2. Missing roots produce an in-app recoverable result. Windows never allocates a console; terminal-only output attaches to an existing console. No PATH installer is included.

## Commands

- startup returns version and optional initial root.
- choose_directory opens the real native chooser; null cancellation preserves the session.
- open_gallery(path) validates selection, retires old access after success and admits discovery.
- snapshot returns current observation without admitting another scan.
- refresh(sessionId) reconciles only the current session.
- close_gallery(sessionId) retires only the matching session.

Only bundled main-window content receives native capabilities. Errors retain code/message and operation context. No shell, broad filesystem-write or remote-content capability is exposed.

Snapshots contain release version, optional session, root label, status/revision, media origin, items and issues. [Data model](../data-model.md) defines semantics; decimal strings preserve native integer values. A later UI open intent invalidates earlier polling responses.

## Media transport

GET/HEAD http://127.0.0.1:ephemeral/media/token/item/revision serves only current grants, with exact loopback Host and allowed Origin validation. No wildcard CORS, directory listing or path-based route. GET supports single bounded/open-ended/suffix ranges, returns 206 with correct headers, rejects invalid/multiple/out-of-bounds ranges with 416 and streams originals without whole-file buffering. HEAD has no body. Stale grants fail; retired sessions cancel streams. Use no-store/nosniff and known media MIME.

## Native test feature

native-tests enables only the optional embedded WebDriver listener. Default builds exclude it. Tests use ordinary CLI roots and production commands, not a new root-selection backdoor. Build/launch the default artifact as well and verify the automation listener is absent.
