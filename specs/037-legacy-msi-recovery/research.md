# Research: S037

## 2026-11-09: source and historical evidence

Two delegated read-only audits inspected native guards and exact historical diagnostic artifacts. Neither ran an installer on the workstation.

- Decision: Separate reproduction from accepted recovery. Historical 131-character failures also contain repeated directories and .local. Start with length 76/131 versus flat/nested structure on fixed C:/ASCII, then isolate dot/repetition and 127–131 boundaries as results warrant. Rationale: existing data confound variables. A universal threshold or larger buffer is not established.
- Decision: Preserve original v0.1.0/v0.2.0 bytes. Their REMOVE=ALL preflight forces validate_destination and ExW even with recovery supplied. A new fallback cannot change an old DLL. Current ordinary MSI preflight already verifies registration, manifest, payload and integrations separately.
- Decision: Investigate authenticated repair through existing recovery journals using a real short-name spelling for the same pinned directory, then ordinary removal. Native repair would own its registration updates. Alias availability, integration spelling, data retention and interruption require proof. A new native transform/patch is a substantially larger alternative; disabling guards or raw registry surgery is not the design.
- Decision: Extend native-desktop.yml's existing MSI diagnostic case with a registration route; use artifact_run=42526613893 and platform=windows. Nonblank artifact_run is essential: blank selects a self-hosted desktop job. Final Qualification elections remain unchanged.
- Decision: Fetch and hash-authenticate exact public predecessor inputs directly for the small probe; avoid downloading the 2.24 GB current cohort input merely to diagnose the old lookup. Historical probe source is commit 1f2d6b1256604284a576db08dbad048fd8d6a604, scripts/diagnose-msi-registration.mjs.
- Decision: Keep VERSION and published snapshots at v0.2.2. Add a source-only unreleased recovery contract and dated changelog decisions. No release publication belongs to S037.

## Primary references

- [MsiGetComponentPathExW](https://learn.microsoft.com/en-us/windows/win32/api/msi/nf-msi-msigetcomponentpathexw)
- [MsiGetComponentPathW](https://learn.microsoft.com/en-us/windows/win32/api/msi/nf-msi-msigetcomponentpathw)
- [MsiQueryComponentStateW](https://learn.microsoft.com/en-us/windows/win32/api/msi/nf-msi-msiquerycomponentstatew)

The documented signatures match the source declarations. No documented 128-character limit was established. A secondary path result alone is not selected-context ownership proof.

## First hosted controls (2026-11-09 UTC)

Exact published v0.1.0 on Windows 2025: flat 76 (42540555510) and nested 76 (42540560340) installed and ordinarily removed with exit 0; flat 131 (42540565388), nested 131 (42540570176), and repeated-name/.local 131 (42540574463) installed with exit 0 but ordinary product removal returned 1603. In each failed control, ExW returned UNKNOWN with empty output while non-Ex returned LOCAL with the exact 131-character path. Nested structure alone does not explain the failure in these controls. Boundary 127–130 and independent-version/repair probes are pending; no universal threshold or supported recovery is claimed yet. Raw logs and JSON are retained under .local/s037-probes by run ID.
