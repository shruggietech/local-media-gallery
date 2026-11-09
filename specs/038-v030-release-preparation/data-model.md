# S038 data model

## Acquisition policy

Identity label and redacted origin; total timeout/absolute deadline; caller signal; finite maximum attempts; per-attempt timeout when elected; bounded backoff/server-delay admission; transport implementation and deterministic clock/pause hooks for tests. A policy permits only idempotent acquisition.

## Attempt observation

Attempt index, safe HTTP status or known transport/timeout classification, elapsed time and retry decision. Raw response bodies, authorization headers, signed query tokens and arbitrary error causes are not diagnostic fields. Transitions: admitted -> requesting/consuming -> complete, or failed -> bounded delay -> admitted, or terminal. Cancellation/exhaustion cannot return to admitted.

## Attempt content and sink

Each attempt owns a new count, digest and buffered chunks. A file sink starts at explicit offset zero after the previous attempt has settled and reset succeeds. Non-resettable output cannot be replayed after delivery. Only existing integrity/size/provenance validation can promote content to accepted/final state.

## Candidate and canonical identities

Candidate version 0.3.0, exact revision/source fingerprint, native artifacts, versioned schema/docs/reference trees and qualification receipts. Canonical publication retains actual published version/record/assets. Prepared sender and canonical Lite receiver have separately recorded versions. No candidate field alone changes public latest.

## Historical inventory

Path, byte length and SHA-256 for existing v0.2.2 documentation/schema/references/retained receipt, plus exact site manifest row. Version preparation may append new paths/compatibility labels but cannot change historical inventory entries.

## Delivery state

Issue #116 / S038; spec and reviewer requirements approval; analyzed implementation tasks; source A vocabulary/snapshot capture and source B; final PR head/CI; up to two hosted review rounds with explicit heads/dispositions; owner merge/publication pending.
