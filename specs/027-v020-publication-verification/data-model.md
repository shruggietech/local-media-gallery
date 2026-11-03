# S027 data model

- ApprovedCandidate: version 0.2.0, predecessor 0.1.0, revision7d714ed723483d6bdb1a2286fb89fcbe8550cd40, logical SHA256, file count, qualificationRun41595557848, immutable artifact inventory and receipts. Source and artifact identity must match accepted assembly exactly.
- PublicationExecution: workflow run/attempt, approved revision, candidateId, upload journal, releaseId, canonical gates and deployment. Transitions: qualified -> candidate gate -> owned draft -> published without latest -> publication gate -> canonical -> latest -> deployed. Any failure retains evidence; retry uses the same candidate's authority.
- PublicReadback: observedAt, canonical URL/hash, asset names/bytes/hashes, predecessor identity, retained gate projections, deployed inventory, live browser results and acquisition receipts. A missing or inconsistent observation prevents completion claims.
- Campaign: issue85, M3, project item, audit PR/head/checks/review rounds. Publication verified -> operational issue/milestone closed; audit PR remains pending owner merge.

Relationships: one candidate has one elected immutable artifact set; multiple execution attempts can reference it without replacing assets. Public readback binds canonical release to retained candidate and deployed site. Campaign references receipts and owner boundaries without becoming product source authority.
