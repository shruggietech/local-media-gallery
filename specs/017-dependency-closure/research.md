# S017 research

## Native driver and media

**Decision**: Owned nonce/PID proof and bounded diagnostics; Linux actual-output observation without altering the media graph.

**Rationale**: Current readiness accepts any HTTP status. Retained main/PR65 failures show stalled media clocks despite running AudioContext/PulseAudio and late attachment with missing PCM; no single root cause was established. Avoid copying the failed experiment. Preserve all functional assertions and acquire explicit stream/capture evidence.

**Alternatives considered**: Random port alone cannot prove ownership. Blanket sleeps, unchanged retries, zero-value receipts and weaker PCM assertions do not resolve evidence failures. A product runtime replacement is disproportionate.

**Primary references**: [Web Audio analyser contract](https://www.w3.org/TR/webaudio-1.0/#AnalyserNode), [PulseAudio monitor sources](https://wiki.freedesktop.org/www/Software/PulseAudio/FAQ/), [PulseAudio stream API](https://freedesktop.org/software/pulseaudio/doxygen/stream_8h.html).

## Governed patched renderer

**Decision**: Evaluate and import [formal BrandBuilder v3.1.1](https://github.com/shruggietech/shruggie-brand/releases/tag/v3.1.1) through the existing importer, requiring authentic full verification with Pillow 13.

**Rationale**: The old recovered renderer settings attest Pillow 12.3. A patched dependency must be truthfully supported by upstream proof; consumer edits to governed reports would invalidate provenance.

**Alternatives considered**: Retaining affected Pillow or weakening attestation would leave #57 unmet. Rebuilding unofficial governed bytes is disallowed. Actual recovered verification is the implementation acceptance gate.

## GLib iterator

**Decision**: Backport upstream [PR1343](https://github.com/gtk-rs/gtk-rs-core/pull/1343), commit b5a4071e439bef2b5eea76c3aa25e5ae84839e34, to exact crates.io glib 0.18.5.

**Rationale**: [GHSA-wrw7-89jp-8q8g](https://github.com/advisories/GHSA-wrw7-89jp-8q8g) fixes the immutable variadic output pointer. The official 0.18 branch/tag remains 42b9caf98e03ded086362d9653ca58fe94dc8658. A new unrelated GLib version does not replace the affected GTK3 dependency.

**Provenance**: crates.io archive SHA256 233daaf6e83ae6a12a52055f568f9d7cf4671dabb78ff9560ab6da230ce00ee5; original iterator 1fd02859333761c45321b32f28b24233446b97d0022a90d3a937ed162585b90e; corrected iterator a0f5ee8acb8faa089bcdfbc9a57372609fce7654026ccef7d9a224d05a654ccc, identical upstream Git blob e0997f651b103f7b198e528ee41137ad374e19b8.

**Alternatives considered**: GTK4 migration changes the product stack. False version bumps and advisory dismissal do not fix implementation. Preserve truthful version/scanner reporting and test the actual optimized dependency.

## Resolved renderer integration gate

Official canonical Windows CI artifact12855331534 from run40775877208/job123124909345 at source65af667461798738b0cf381b7c8bc4487afd853a supplies the supported portable attestation. Its archive SHA256 is bbd3b90493b311c1ed5b5a6357fe03f371505cc7d307800961f255e6b10085e9. Retain only33source-matched original report/proof files (133675bytes) through the importer. With these proofs, the unmodified3.1.1release kit and exact recovered verifier pass all36checks underPillow13. The report is authentic upstream output, not a consumer rewrite. No upstream compiler change or candidate release is required.
