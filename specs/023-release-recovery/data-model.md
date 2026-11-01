# Data model

Existing candidate and canonical release JSON contracts are unchanged.

An observation is pending only when a validated owned resource is absent or retains the explicitly expected pre-mutation state. Conflicting ownership, malformed identities or unrelated latest selection are terminal failures. Observation deadline is the minimum of its local bound and active global deadline.

Retained gate evidence has formatVersion 1, phase, exact gated release record, selected version manifest and a complete static file inventory. The export is its sibling directory. Candidate and publication evidence are separately named; neither can substitute for the other. Verification binds source/renderer identities, gate projection and exact inventory.

The existing starter journal remains candidate-owned and maps asset names to attributable zero-byte IDs. Removal is observed before replacement. A published package remains immutable.
