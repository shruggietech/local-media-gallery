# S017 evidence data model

## Owned driver observation

Fields: child PID, fresh nonce expectation, requested loopback origin/port, last HTTP/listener result, bounded stdout and stderr (each at most 16384 characters), nullable error/exit/signal, trial/edition/source context. State: starting -> identity-proven ready, exited, failed or deadline. A status response alone never advances to ready.

## PCM observation

Fields: fixture and source identity, owned application process/stream, sink/monitor identity, capture method/state/rate/count/window, RMS/frequency, bounded diagnostic samples. Missing PCM is unavailable and fails, while measured zero PCM can satisfy only the silent control. Records are bounded and never contain fixture payloads.

## Vendor provenance

Fields: package/version, source URL/revision/archive SHA256, exact source inventory, allowed patch with original/final file SHA256, license paths. Any extra/missing/changed byte fails before qualification. Package version remains truthful even if a version-only advisory scanner cannot recognize the backport.

## Qualification record

Reuse existing source/artifact/fixture identities, terminal outcomes, receipts and separated elapsed accounting. No new user-state schema or public product command is introduced.
