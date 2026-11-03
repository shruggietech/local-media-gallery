# Data model: release preparation

## Release scope

Version0.2.0, predecessor0.1.0, six existing edition/platform products, corresponding source/metadata, supported behavior and migration guidance. Version identities agree; a prepared record is not a published release.

## Historical preservation baseline

Fixed source commit, version0.1.0, complete documentation/schema/captured-reference file paths, byte lengths and SHA256 values, retained receipt identity and historical manifest entry. Current actual inventories must equal this immutable reference in S026. A mismatch is a failure, not a reason to regenerate expectations during testing.

## Current retained snapshot

Existing receipt format: capture sourceRevision, current snapshot inventory and ordinary glossary review bound to that inventory. Source A is committed before capture; final qualification revision B includes the derived receipt and remains separately attributable.

## Candidate and handoff state

Source prepared -> current receipt refreshed -> locally verified -> official PR -> nine qualified scopes and independent readback -> reviews resolved -> owner handoff. Actual merged-main qualification/publication/canonical promotion is outside this preparation state machine. Missing/changed bytes or stale source prevents advancement.
