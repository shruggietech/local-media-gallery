# Data model

## Preferences

Native typed fields: version=0.0.0; formatVersion=1; pageSize=24|48|96 (default48); cardSize=small|medium|large (defaultmedium); controlsExpanded=false; scrollIndicator=auto|always (defaultauto); metadataExpanded=false; filter=all|image|video (defaultall); sort=name|modified|size (defaultname); direction=asc|desc (defaultasc). Compatible unknown properties survive saves. Invalid known fields reject the stored document with a warning rather than partially accepting unsafe values.

Envelope: settings, opaque revision, warning. Load defaults without writing when absent. Save validates expected revision, persists atomically under process/file serialization and returns the new envelope. UI queues writes and applies current preference immediately; failure remains visible and choices remain usable in memory.

## Collection and presentation

Snapshot: same session/item/revision access contract. Opening/Refresh alone enumerate; snapshot reads cached data. Scan lock serializes; stale session request cannot scan replacement root. Facts cache key item id+revision. Page index1..max(1,ceil(filtered/pageSize)); changing filter/sort/page size resets1. Viewer uses full ordered ids, updates page on navigation/close. Masonry computes x/y by shortest column, retains sorted DOM order. Viewer has one media node and persistent global metadata disclosure; gallery nodes are unmounted.
