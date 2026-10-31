# S019 maintainer readiness and policy contract

The shared readiness function acquires the complete locked Cargo graph without selecting new versions, then performs native-target metadata collection with --offline --locked. All commands use closed stdin, redirected output and hidden Windows processes with bounded failure. Cargo.lock must remain byte-identical. No new persisted admission token is required.

The production notice collector is reused by package assembly and cold evidence, preserving package selection and notice normalization. An unavailable Rust source directory fails rather than silently omitting a package.

The isolated Linux preparation witness uses the real workspace, a fresh Cargo home and empty target, actual fetch/offline metadata/notices and exact missing-tempfile repair. Its receipt identifies the lock, graph, stages, confinement and lack of compiler output. Artifact retention includes success and failure observations.

Ordinary native compiler/linker bytes are retained. Current project builders/helpers/CI invoke no codesign/notarization/signing service. Payload checks require complete inventory and physical authority rather than signature resources. Native identity and Full/Lite behavior still determine runtime acceptance.

All eight scopes and the owner-approved publication/review boundaries remain unchanged. Product release execution and upgrades are excluded.
