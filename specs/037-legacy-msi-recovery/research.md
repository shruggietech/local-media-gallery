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

## Boundary and rejected alias repair (2026-11-09 UTC)

The nested 127, 128 and 129-character controls removed with exit 0 (42540890205, 42540894085, 42540897931). The 130-character control failed with 1603/ExW UNKNOWN (42540901604). This establishes a 129/130 boundary for the elected host and path family, not all Windows versions. Exact v0.2.0 at 131 also failed (42540909277); v0.2.1 and v0.2.2 ordinarily removed at 131 (42540913236, 42540916963), despite their separate ExW observations also being UNKNOWN.

Existing same-physical-directory short aliases were independently verified, with full payload and file-ID agreement, before repair through a fresh protected legacy journal. Both v0.1.0 (42540905466) and v0.2.0 (42540909277) refused with Recovery destination differs: native costing expanded INSTALLDIR back to its original long spelling. No product recovery code will adopt this failed mechanism. Original failures and patch feasibility remain separate evidence.

A new customization transform cannot be appended to an installed product; Microsoft documents the fixed transform list. The next supported option under evaluation is a narrowly targeted native MSP that changes the legacy Preflight action while preserving full identity/payload/integration checks. The original MSI and published release bytes remain unchanged. No registry/cache surgery, volume policy change or blanket guard suppression is an alternative. Existing pinned WiX Torch/Pyro tooling is being tested with a metadata-only prototype before production adoption.

## Native patch mechanism evidence (2026-11-09 UTC)

A metadata-only prototype applied with exit 0 while preserving the original native product/package identity (42541702915). Actual payload-bound guards then reproduced original removal 1603, applied their respective MSP with exit 0, refused a deliberately changed owned file with 1603 and ordinarily removed with exit 0, for both v0.1.0 (42543325329) and v0.2.0 (42543328944). Independent bytes survived and native registration became absent. These runs identify the mechanism; they do not qualify the final integrated candidate.

Preserved failed observations include the first guard selector omission (42542564705/42542568901, no patch execution counted) and the individual WiX validation-flag syntax failure (42542858231/42542862109). Regression assertions now require actual elected patch/removal actions, and the verified tool grammar uses one validation flag per switch. Discarded alias/metadata-only experiment code is removed from the final implementation; its original artifacts remain diagnostic history.

The final Full assembly carries both authenticated MSPs. Existing transaction supervision elects retained matching inputs, observes applied native state, preserves unique step receipts and reconciles interrupted coordinators. Complete hosted qualification additionally elects the long Unicode location, wrong-version/retained-input/owned-file refusal, actual coordinator interruption, replacement, restoration, standalone native patch entrypoint, registration/integration cleanup and retained state/runtime.
