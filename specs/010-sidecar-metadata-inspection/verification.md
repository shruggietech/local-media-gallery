# S010 Verification

## Setup and design (2026-10-25)

Base main: 0ed8a71d251d479d60ca546ccc18ef3f3147f27c. Branch codex/010-sidecar-metadata-inspection; selector specs/010-sidecar-metadata-inspection; scope #13/#14.

Installed skills-mode Spec Kit1.0.8: specify -> clarify (five autopilot decisions) -> checklist -> plan (three required read-only research agents) -> tasks -> read-only analyze. No extension hooks. Analysis mapped all12FR/5SC to22tasks,100% coverage,0critical/high/conflicts/unmapped tasks. Requirements checklist16/16; custom metadata checklist0/12 remains reviewer-owned, with owner autopilot authorization to continue. The installed checklist prerequisite requires plan earlier than the skill sequence; canonical template was resolved directly for pre-plan checklist creation.

## Implementation and qualification

Pending. No passing feature evidence is claimed yet. Final merge remains with owner. Push/official PR explicitly authorized; review cap two rounds.

## Implementation checkpoints (2026-10-25)

Exactness/native API tests first failed for absent metadata contracts. Summary settings test reproduced invalid known selections being accepted as unknown fields, then passed with bounded validation. Owned schema tests reproduced permissive unknown summary values, then passed. Aggregate decoding failures reproduced12 reads rather than8 under the elected8MiB budget, then passed after charging all actual bytes. Mixed-type repeated index references reproduced missing ambiguity and passed after counting all selected-key members. Native alias test rejected capability canonicalization as a case-normalizer; native lookup identity and exact observed-name precedence passed instead.

Pre-final checks:58Node tests,32core tests (including11metadata),34shell/state tests and28actualWindowsWebView groups passed. Test-feature metadata suite12/12 additionally includes held-read control/retirement. Restricted-token hardlink/symlink/replacement fixture failures passed unchanged under the existing elected elevated hidden launcher; no test was skipped/weakened. A full final qualification on the final source follows.

Initial full qualification passed at2026-10-25T10:39:03.870Z:57.674s preparation,134.434s qualification,192.108s combined; source e92490ce312eddc68022ccc506fa94fba373c2c55ab1ad0c0bab22319f70f4f3 (966files),all10steps,28renderedgroups. That source is superseded by the final native-component identity correction. A reproduced Windows invalid-UTF16 filename pair had the same replacement-character label/source key; distinct tagged native-component identifiers now pass core/persistence/schema regressions. Final qualification is rerun on this corrected source.

## Final local acceptance (2026-10-25)

All10 elected steps passed. Preparation 42.574s; qualification 137.846s; combined 180.42s. Terminal 2026-10-25T10:44:44.547Z. Source SHA256 da459c15f126e1156529c1b012818c9105522b269cb85afa5ebfdbba9983b78e, 966 files.58Node tests,33core tests (12metadata),34shell/state tests,28WindowsWebView groups,site static/browser checks,normal default-feature artifact exclusion and unchanged source/media/brand checks passed. Source exclusions are only delivery records listed in scripts/provenance.mjs; requirements/design/code/tests/contracts remain hashed.

Evidence: .local/s010-final-qualified.json, .local/native-results.json, .local/normal-results.json, .local/site-artifact.json and .local/site-browser.json. Windows local native fixture evidence remains distinct from native Linux/macOS, physical network/removable providers, large collections and package installation. No product package/release publication occurs.
