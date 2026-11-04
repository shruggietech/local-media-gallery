# Verification: S029 private storage and recovery

## Scope and identity

S029 implements issues #90, #91, #92 and #93 on codex/s029-private-state-storage. The source candidate is v0.2.1. No release/tag/publication or merge is authorized by this slice. The owner retains final review and squash merge.

The v0.2.1 documentation inventory is retained from commit 3b966c727c60807a660ef5e8fecd6c761001392f. Its inventory digest is e38785f7fd71882300b614cac2fccdcc3f43c7f1cc89c5da4c6a188212eab9fe. Published v0.0.0, v0.1.0 and v0.2.0 snapshot inventories remain unchanged; v0.2.0 remains the actual published release.

## Spec Kit gates

The installed Spec Kit specify, clarify, checklist, plan, tasks, analyze and implement workflows resolved the repository templates and feature selector. Analyze covered all 15 functional requirements with 26 tasks and no blocking findings. The requirements checklist is complete. Custom reviewer-owned checklist markers remain unchanged under owner-authorized autopilot.

## Local evidence

All local command children use the verified hidden launcher with redirected noninteractive I/O. Rust temporary files are in the workspace temporary directory and updater/package fixtures elect explicit protected temporary roots. No GUI or keyboard/input automation runs on the active workstation.

- Application directory tests first failed because the new path selectors were absent, then passed after implementation.
- Updater context/coordination tests first failed against absent APIs. The initial ancestry check also exposed ordinary AppData capability ACLs; the implementation now pins OS ancestors physically while strictly validating the elected protected updater root. No OS ACL is rewritten.
- Private-state tests confirmed the former preserve-and-block assertions fail under the new required reset behavior. Updated regressions verify compatible release labels, invalid content reset, writable next saves, hardlink refusal, lock contention, preserved external bytes and in-place SQLite identity across a live connection.
- Repository check passes for authored UTF-8/no-BOM/LF text, local links, version alignment and governed brand integrity.
- Node tests: 264 passed, 2 existing skips, 0 failed (266 total).
- Documentation checks: 4 versions, 282 requirement definitions, 800 local links/fragments, 18 top-down diagrams passed.
- Normal workspace and native-tests/tooling Clippy checks pass with warnings denied.

Full workspace Rust units passed. Full, Lite and native-tests application configurations each passed 75 unit tests. The final updater/package rerun passed 15 updater unit tests, 16 transaction integration tests and 23 Windows package unit tests; its 2 existing actual-MSI cases remain elected by package CI. The worker output ACL regression first failed on an inherited DACL, then passed after all supervisor/client scratch was created with the protected private-file API.

The app check passes formatting, affected Rust suites, warnings-denied Clippy, TypeScript, ESLint, governed CSS and brand recovery/glyph validation. Its initial local brand invocation lacked the proof Node at the reused checkout path; selecting the already-provisioned exact Node prerequisite resolved that failure without changing governed bytes.

Headless site checks and hosted native/package acceptance are recorded below when terminal. Logs are retained under the workspace .local directory. Earlier failed observations remain diagnostic and are not acceptance evidence.

## Delivery boundaries

Ordinary exact-byte desktop, offline installer, interruption, native registration and package rollback acceptance belongs to disposable hosted CI profiles. Local unit/headless checks do not establish those outcomes. The PR must retain terminal applicable final-revision CI evidence and address every review thread with no more than two review rounds. Push/PR creation is authorized; final merge and actual publication remain owner-controlled.
