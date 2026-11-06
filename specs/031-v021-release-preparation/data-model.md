# Data Model: release preparation

- PreparedRelease: version 0.2.1, predecessor 0.2.0, six existing product rows, highlights, support and known limits. State remains unpublished throughout S031.
- AcceptedQualification: trusted run/revision/source, canonical scope receipt hashes and elected candidate identity. Supporting authority exists only after matching the canonical Windows receipt hash.
- SupportingArtifact: campaign experience or lifecycle; unique positive artifact ID, immutable name, lowercase sha256 digest, exact declared bytes no greater than 5 GiB, same run/revision/attempt/source/common clock as the accepted gate. Missing, duplicate, expired, mismatched or oversized values are invalid.
- DownloadedEvidence: exclusive partial archive -> verified exact byte count/digest -> atomic retained ZIP -> bounded validated extraction -> matching worker receipt/fragment -> complete release reassembly. No failure grants acceptance or selects replacement artifacts.
- RetainedSnapshot: current docs/schema/reference inventories and committed source revision plus ordinary vocabulary review. Published 0.0.0/0.1.0/0.2.0 retained bytes remain immutable.
- ReviewLedger: initial automatic review plus zero or one follow-up request, findings/replies/resolutions and final head/checks. State ends at owner merge handoff, not publication.
