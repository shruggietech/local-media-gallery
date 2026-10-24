# Discovery interface contract

S009, release-aligned application version0.0.0. Public authoritative definitions will be updated under docs/ and schemas/.

- startup schedules its initial root once after the frontend subscribes; it returns current state without waiting for directory enumeration.
- open_gallery/choose_directory/reopen_recent reserve and enqueue an open request. Acknowledgment does not mean enumeration completed. Root validation failure retains the prior usable session and attributes the requested failure.
- refresh(sessionId) reserves requested work on the held root. Actual enumeration serializes. A newer request supersedes an old operation; retired jobs cannot publish or admit further entry work.
- cancel_discovery(operationId) retires only the matching current operation. Repeated or stale requests return an attributable stale-operation result; completion already committed is retained.
- close_gallery(sessionId) retires the matching root and outstanding discovery immediately, including queued opening. Window shutdown also cancels pending startup/selection work when no session exists.
- gallery-changed events and command results carry snapshot.sequence as a decimal string. Clients reject lower sequence values globally, including across session replacement/close. Counts and file sizes remain exact strings.
- snapshot.discovery describes independent request identity, kind, phase, entriesSeen/mediaSeen and message. Top-level status describes current presentation; pending/failed open may retain a usable prior root. MediaItem.stale identifies an unconfirmed prior observation. Unavailable is root access/identity loss; failed is an internal worker failure.
- No timer, event listener or snapshot/settings read enumerates. Only explicit requests initiate work.
- Initial useful observations publish immediately. Further batches publish after32 entry observations or100ms elapsed at a cooperative entry boundary; final state always publishes. This introduces no directory-polling timer.
- Native-test-only control surfaces can hold/release discovery and inject operation-scoped iterator/root failure. Normal builds have no such commands, environment controls or dependency feature.
