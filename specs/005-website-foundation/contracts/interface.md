# Website and qualification interfaces

## Public routes

Root is independent marketing. /docs/ and /docs/latest/ are usable static aliases. /docs/<version>/ and /docs/<version>/<topic>/ read the selected retained snapshot. /changelog/ renders the master source. /docs/<version>/schema/ exists only for a matching application schema. /support/ and /license/ expose public repository policies. /raw/<version>/ holds only inventoried sources/assets. Source links never expose specs, machine paths or arbitrary repository files.

## Manifest and sources

site/versions.json owns latest, ordered snapshots/topics and optional schema/examples. Snapshot paths are repo-relative confined allowlisted roots. Build rejects duplicates, missing sources, unknown latest, unsafe URL schemes, external-path escape and mismatched schema/release identity. Historical external references are captured into snapshot-owned reference files so future kit updates do not rewrite history.

## Maintainer commands

npm run build:site stages governed assets and compiles the static export. npm run check:site checks source/render/raw/route/fragment/artifact identity. npm run test:site runs browser acceptance. npm run ci -- <scope> runs prerequisite preparation followed by bounded qualification and writes .local/ci-<scope>.json. Scopes identify actual evidence; hosted product checks are not native runtime acceptance.

## Review protocol

Automatic opening review is round one. At most one @Codex request may trigger round two after fixes. Reply to every actionable finding, resolve individual threads only after correction/explanation, wait for final-head terminal checks, and halt for owner review before merge.
