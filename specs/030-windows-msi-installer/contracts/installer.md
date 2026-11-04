# S030 installer contract

## Ordinary entrypoint

One unsigned Windows x86_64 Full MSI contains the application, native ownership helper and pinned complete offline Evergreen WebView2 installer. No companion payload or installer is required by recipients. Lite remains its existing EXE.

## Inputs

ALLUSERS=2 and MSIINSTALLPERUSER=1 select current user by default; clearing MSIINSTALLPERUSER selects machine during first installation. INSTALLDIR selects the absolute location. StartMenu and CommandPath feature membership independently selects integrations; explicit properties in the wizard are translated into native feature state before execution. License acceptance precedes interactive mutation. Quiet operations use explicit documented properties with the same checks and /L*v diagnostic log.

## Lifecycle

Determine actual context after MSI costing and use actual registration identity. Persist feature choices. Maintenance never re-enables absent integrations implicitly. Preflight validates actual owned bytes, destination/integration conflicts and sealed recovery authority. Removal touches only unchanged owned files and selected owned integrations, retaining foreign extras, media, settings and shared runtime.

## Outcomes

Use native MSI success/cancel/failure/reboot semantics. Progress names actual phases, including runtime detect/provision/verify. Cancel during vendor work remains visible, waits for bounded vendor completion, and rolls application installation back. Timeout is incomplete work with retained diagnostic evidence. No fake percentage or unsupported quiescence claim.

## Compatibility and publication

Retain exact published predecessor bytes and identity checks during replacement/recovery. Current 0.2.1 metadata describes Full MSI; published 0.1.0 and 0.2.0 remain unchanged. This slice opens a PR; it does not merge, tag or publish a release.
