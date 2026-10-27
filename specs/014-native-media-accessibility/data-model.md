# S014 Qualification Data Model

## Fixture inventory

Version1, exact per-file relative names, byte lengths and SHA256, expected dimensions/orientation/corner samples, ICC profile identity and deterministic expected signal/frequency; no private corpus or source paths. Original inventory before/after must match byte-for-byte. Existing twelve-item fixtures remain separate.

## Native runtime receipt

Version1; source digest/revision; qualification binary SHA256/bytes/edition; corresponding normal artifact identity; OS/architecture/webview/version/user agent; display kind/DPI/devicePixelRatio/window/zoom; native input method and trusted events; actual AX/AT client/version; checks with monotonic operation order, result pass/fail/unavailable, terminal timestamps and bounded evidence. Exact byte/count identities use decimal strings. Missing observations are null plus reason, never zero/success.

## Media observation

Name/hash, declared format/codec/profile/orientation, actual success/unsupported outcome, decoded dimensions and sampled values, independent seek/range/audio observations, useful recovery text and integrity outcome. Audio graph state/RMS/peak is separate from physical output. Tagged SDR conversion is separate from HDR/display calibration/unmanaged previews.

## Accessibility observation

Bounded native tree records (role/name/value/state/focus/bounds), actual source technology and scope; gallery-only NVDA generated speech strings with exact version/isolated profile identity and explicit silence-synth/output limit. Source ARIA and axe findings remain separately typed. At most2048 native nodes/depth32, at most256 speech records/262144 serialized bytes; overrun or missing essential observations fails acceptance, never silently truncates into success.

## Lifecycle

Preparation -> verified readiness -> session admission -> media/interaction/presentation/native-AT checks -> observed app/reader shutdown -> integrity/source recheck -> terminal receipt. Failure/cancellation still records scope and terminal outcome; cannot publish an accepted partial receipt. Native unavailable infrastructure remains failed/unavailable and blocks that elected row.
