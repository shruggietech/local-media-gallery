# Verification: Global font size

**Result**: Passed Windows x64 qualification on 2026-10-22. Default (100%), Small (90%) and Smaller (80%) apply immediately and persist across restarts. Existing settings without fontScale retain 100% without being rewritten on load.

## Test-first evidence and corrections

- A focused native probe against the prior binary failed with `Global font size setting is missing` before UI implementation.
- Four new native settings regressions failed before implementation while the existing nine settings tests passed. All thirteen settings tests pass after implementation.
- The new schema regression failed on the absent property/default, then passed with the existing contract tests (three total).
- The first full qualification passed the font-ratio and geometry checks, then failed when restart automation connected before the native window existed (`No window could be found`). The driver now waits for main-window readiness within a bounded twenty-second retry. The subsequent complete qualification passed. The failed attempt took 54.587 seconds preparation and 84.564 seconds qualification (139.151 seconds combined).

## Final qualification

The existing qualification runner ran with one Cargo build job and hidden noninteractive child processes. Terminal timestamps are authoritative.

| Measurement | Result |
| --- | --- |
| Preparation started | 2026-10-22T18:40:45.171Z |
| Prerequisite readiness verified | 2026-10-22T18:41:22.400Z |
| Terminal completion | 2026-10-22T18:43:09.521Z |
| Preparation | 37.229 seconds |
| Qualification | 107.121 seconds |
| Combined | 144.350 seconds |
| Qualification target / hard limit | 660 / 900 seconds |
| Provisional finalization reserve | 15 seconds |
| Target advisory | None |

All mandatory checks passed:

- `npm run check`, `npm test` (21 Node tests) and `npm run check:docs` (15 documents, 71 requirement definitions, 144 local links, four diagrams).
- `npm run check:app`: Rust formatting, eleven core tests, Clippy with warnings denied, TypeScript, ESLint, Stylelint and pinned brand proof.
- Fourteen native shell tests, including thirteen settings tests and one argument test.
- Nineteen Windows WebView2 acceptance groups with twelve fixture candidates and a private four-item page. Font coverage measures eight gallery text surfaces and five viewer text surfaces at all three presets. Root font size, card/media widths, card gaps, toolbar height, control minimum height and viewer geometry retain their existing sizing. Stored 80% and restored 100% both survive restart; Default restoration uses trusted Windows keyboard input.
- Existing functional groups cover sorting/filtering, native decode/orientation, playback and pause, seeking, keyboard/focus, native folder selection/cancellation, manual refresh, relocation, pagination, scoped access/ranges and settings failures. Playback/keyboard tests use Windows SendKeys; seeking uses DOM setup and decoded-frame observations. Native picker tests use UIAutomation. No trusted seek-input claim is made.
- Normal executable window, help, version, invalid-option exit 2 and absence of the test listener.
- Source provenance and unchanged governed brand kit. Brand verification reports 36 checks with no skips/problems; glyph validation reports fifteen checks with no warnings/failures.

## Qualified identities

| Artifact | SHA-256 |
| --- | --- |
| Source, 841 files | `d70e876b537f34e07ccee04515b93837aab2d44346386c46f66778a4c7f55df3` |
| Normal Windows executable | `896c1dd97de0aadc1630009d03c07fa41c5578dbc292e8037d900fc2a0e13203` |
| Instrumented Windows acceptance executable | `8599c2c434adada95030ce8453378079525d27489b95c9bcf971588783c48aec` |

Only this verification record and this slice's tasks file are excluded from source identity so evidence can be finalized. Prior slice evidence is included. Finalization rechecks the source digest and repository integrity before the local commit.

## Limits and deviations

No implementation deviations remain. Linux/macOS native runtime, large collections, physical touch, installer/Lite dependency closure and universal codec support remain unqualified. Font scaling covers application text; OS dialogs and built-in native media controls retain platform styling. No bulk fixture or owner dataset was used. Non-failing build diagnostics were an incremental-cache hardlink fallback and the pinned brand verifier's PyMuPDF deprecation warning.

All changes and acceptance evidence remain local; no remote, push, tag, release or publication is authorized.
