# S002 proposed acceptance coverage

**Status**: Verification design only; no application behavior has been exercised

**Specification**: [First working local gallery](spec.md)

**Decisions**: [Proposed defaults and Q-01](decisions.md)

## Small fixture contract

Use one small, owned or redistribution-permitted fixture, proposed as twelve media candidates. Reuse it for opening, sorting, filtering, viewing, mutation and relocation. A fixture manifest records exact expected names, bytes/hashes, dimensions/durations where known and the expected supported/unsupported result.

| Contents | Proposed count | Coverage |
| --- | --- | --- |
| Valid JPEG/PNG/WebP still images | 8 | Portrait, landscape, square, extreme ratio, an orientation-tagged photo and filename/sort variation |
| Short MP4/H.264 clips | 2 | One AAC-audio clip, one silent clip; actual play/pause/seek rather than poster-only checks |
| Recognized media with an unavailable/out-of-scope codec | 1 | Inspectable unsupported result on the elected runtime; fixture identity recorded during planning |
| Deliberately damaged recognized image | 1 | Attributable failure with surviving siblings |

Add only the boundary entries needed for a case: an unrelated document, one hidden entry, one child directory with one media file and a linked child where the native environment permits creating it. These are inclusion/failure fixtures, not a second large dataset. Unicode, spaces, `#`, `%`, differing numeric filenames and equal sort properties can be spread across existing fixture entries.

For additions, removals and replacements, mutate one temporary fixture entry at a time. Relocation reuses the collection under another parent; it does not require duplicating or generating hundreds of files. Do not use a personal media directory as destructive-test input.

There is no 1,000-image run, bulk-image benchmark, generated stress corpus or high-count metadata substitute. Native playback assets are small and short. No performance-at-thousands claim follows from this verification design, and no arbitrary file-count limit is added to the product.

## Acceptance map

| Case | Required observation | Requirements | Success criteria |
| --- | --- | --- | --- |
| A-01 Open/select/cancel | Native picker, explicit terminal root, empty start and cancelled selection produce the specified root/session state | FR-001, FR-002 | SC-001, SC-005 |
| A-02 Discovery and inclusion | Expected direct-file inventory; nested/link/hidden/non-media exclusions; scanning/complete/partial/empty distinctions | FR-003, FR-004, FR-005 | SC-001 |
| A-03 Ordering and filtering | All/Images/Videos counts and all proposed sort directions match known facts, including ties and unavailable values | FR-006 | SC-003 |
| A-04 Images/cards | Each required still-image format displays; aspect/orientation and full-image access are correct at narrow/wide sizes; next/previous follows current results | FR-007, FR-008 | SC-002, SC-003 |
| A-05 Video | Both clips play, pause and seek in the native host; audio stops on close, replacement and root switch | FR-009, FR-014 | SC-002, SC-005 |
| A-06 Information/failure | All twelve candidates have accessible information; unsupported/damaged items show useful results and leave siblings usable | FR-010, FR-011 | SC-002, SC-005 |
| A-07 Changes/refresh | A settled add/remove/replace updates within five seconds; manual refresh reconciles after a simulated missed notification | FR-012 | SC-004 |
| A-08 Relocation/stale results | Same collection opens at a new parent; replaced roots reject old observations, URLs and playback | FR-013, FR-014 | SC-004, SC-005 |
| A-09 Work lifetime | Delayed fixture reads and rapid root/view changes show bounded pending work, no eager playback and released retired-session resources | FR-015 | SC-005 |
| A-10 Keyboard/feedback | Picker, controls, viewer/details and recovery are operable with visible focus, meaningful labels and reduced-motion behavior | FR-016 | SC-006 |
| A-11 Source/access integrity | Before/after inventories and hashes agree; zero new gallery files; out-of-root/stale references rejected; text does not execute | FR-017, FR-018 | SC-006 |
| A-12 Built local application | Launch the bundled application without the development server; helpers stay hidden/noninteractive; outcomes distinguish build from native/media results | FR-019, FR-020, FR-022, FR-023 | SC-007 |
| A-13 Evidence scope | Only the agreed small fixture is used; tested revision, native environment and unverified targets are recorded without release or scale claims | FR-021, FR-022, FR-023 | SC-007 |

## Test layers and limits

Focused core tests should cover inclusion, deterministic sort/filter behavior, stale-result rejection, path resolution, cancellation and failure containment with small cases. UI tests should exercise view state, keyboard/focus behavior, item information and media lifecycle. They do not replace actual native media tests.

The elected native environment must launch the bundled interface, load the selected-root resources, play/seek the real short clips and reject invalid/out-of-scope references. A browser preview, mocked native API or successful compile alone cannot satisfy A-05 or A-12. Appropriate native automation belongs to the subsequent plan; tool availability must be verified rather than assumed identical on every OS.

The five-second change window begins after a fixture mutation is closed/stable and ends when the affected visible state matches the inventory. Wait on observable completion with a bounded failure result; do not use a fixed sleep as proof. Record cold-open and interaction observations if useful, without turning this small fixture into a speed, memory or package-size claim.

Where a failure cannot be induced on an elected environment, record the exact unexercised case and separate synthetic coverage. Root read-only/permission cases use isolated temporary data and native mechanisms; a Windows folder's read-only attribute alone is not proof of denied writes.

## Acceptance prerequisites

The owner elected Windows-first native acceptance in Q-01. Windows native build/launch/media checks are therefore required for S002; Linux/macOS native results remain explicitly deferred. The remaining scope/default proposals are not approved implicitly by that answer. Linux/macOS remain product targets. No installed Full/Lite package, remote workflow, release tag or public website is part of the acceptance surface.

Implementation qualification follows the repository's functional/integrity/provenance checks and its 660-second target, 900-second hard limit and fifteen-second finalization reserve after prerequisite readiness. Native results and any missing elected checks must be explicit. User observations normally follow releases; this document does not create an attended pre-release approval test.
