# S038 acquisition and release contract

Acquisition retries include response headers and complete body consumption. Attempts are finite and share one absolute caller budget. Only elected temporary HTTP/transport failures retry. Permanent HTTP, TLS/configuration, size, decoding, digest and compatibility failures remain terminal. A valid server delay that cannot fit the elected wait/budget causes termination instead of an early retry. Cancellation during request, body or delay prevents later admission.

Accepted content is complete, bounded and subsequently verified by existing byte/digest/archive/provenance contracts. Failed partials are not final artifacts. Each replay has independent state; only an explicitly resettable settled sink can replay after delivered chunks. File replay uses truncate plus explicit offsets. Existing verified files and foreign destinations are not overwritten.

The GitHub client retains origin allowlists, five-hop manual redirects and cross-origin credential removal. GET acquisition may retry. POST/PATCH/DELETE/upload remain one-shot; pending mutation observation remains an independent bounded read process and retains original failure semantics. Existing canonical/supporting 300/600-second transfer allowances remain bounded by parent deadlines.

Software, schemas, docs and metadata align to candidate v0.3.0. New snapshots follow existing shapes without advancing observed canonical latest. v0.2.2 and older released bytes/records remain unchanged. New candidate senders can prepare the current published Lite receiver, with both actual versions recorded. Candidate native proof and post-publication recipient proof are separate.

All existing qualification elections, latest-published ordinary upgrades and both affected legacy maintenance rows remain required. Target/hard/reserve remain 660/900/15 seconds with terminal timestamp authority and separate preparation/qualification/combined accounting. Final acceptance requires all exact-head applicable CI and independent complete native/byte readback. Final review records actionable dispositions and any service failure within two rounds. Owner merge and publication remain separate.
