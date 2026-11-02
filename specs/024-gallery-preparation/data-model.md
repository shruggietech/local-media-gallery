# Preparation data model

- Selection: optional presentation patch, thumbnails boolean, recipient platform IDs (windows-x86_64, linux-x86_64, macos-aarch64). Duplicate or unsupported IDs fail admission.
- Preview: opaque id/session, original settings revision, bound root capability, selected actions, canonical release/candidate identity, exact destinations, compressed/extracted/entrypoint bytes, collision/reuse disposition.
- Job: monotonic decimal sequence, previewing/ready/running/cancelling/success/partial/cancelled/failed, active action, bounded per-action outcomes, transferred/expected bytes and thumbnail progress.
- Recipient: canonical artifact bytes/digest, complete extracted inventory including executable modes, immutable per-platform output receipt with no sender absolute path, root entrypoint inventory.

Preview performs no gallery writes. Execution rechecks root/session and destinations, stages privately, verifies bytes before extraction, and commits only new output. Existing matching complete output is reused; unrelated or modified output is preserved. Each action terminates independently. Cancellation removes incomplete stage and waits for thumbnail/helper termination before reporting terminal state.
