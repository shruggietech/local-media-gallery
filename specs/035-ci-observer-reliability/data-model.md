# Data model: native qualification observations

## Observer identity

Revision and SHA-256/files identify the current harness. Hosted run/attempt/job and exact elected artifact IDs identify transport. The cohort clock is immutable: readiness, active/hard deadlines, target 660, hard limit 900, reserve 15. Terminal timestamps determine acceptance.

## Actor observation

PID, parent PID, process creation token, executable path/digest and operation binding identify a candidate actor. Missing facts are null. PID alone never grants signalling authority. Transitions: discovered → identity-validated → stop-requested → observed-stopped → admitted-interruption → killed/reaped, or resumed/rejected/missed with failure diagnostics. Every signal revalidates identity.

## Checkpoint

Monotonic sequence, UTC timestamp, source/clock/campaign context, phase/request/action, actor identity and pending/terminal/cleanup status. Data is finite and allowlisted; no environment or credential serialization. The latest checkpoint survives an uncompleted request. A partial diagnostic record never constitutes successful qualification.

## PCM capture

Required frames/bytes, received bytes, chunk count and bounded chunk sizes, first/last progress times, elapsed timeout, partial SHA-256, bounded stderr and process terminal facts. Transitions: pending → complete or deadline/exit/spawn/stream failure → bounded owned cleanup. Only complete bytes with valid native signal/absence facts can pass.

## Published recipient

Canonical release version/candidate/product source and exact public Lite artifact bind the delivered bytes. Harness identity binds the observation separately. Prepared gallery inventory/archive modes, retained settings/media and original native screenshots bind in-place/relocated/Refresh behavior. Existing public records remain immutable.
