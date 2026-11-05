# Feature Specification: Windows MSI installation experience

**Feature Branch**: `codex/s030-windows-msi-installer`

**Created**: 2026-11-04

**Status**: Specification complete

**Input**: Complete #89 under S030 using Spec Kit and autopilot; push/open the PR automatically, handle CI and at most two review rounds, then owner final review and merge.

## User Scenarios & Testing

### User Story 1 - Install offline from one MSI (Priority: P1)

A Windows Full recipient opens one unsigned MSI and installs the gallery without acquiring or running a separate prerequisite package.

**Why this priority**: The installer is the first ordinary Full interaction; the current technical-message-box EXE does not meet the requested workflow.

**Independent Test**: On an isolated Windows host with WebView2 absent and networking disabled, copy only the MSI, complete installation, and use native browsing and bundled thumbnails.

**Acceptance Scenarios**:

1. **Given** WebView2 is absent, **When** the recipient installs the MSI offline, **Then** the bundled runtime is detected/provisioned automatically and the installed gallery works without separate downloads or manual setup.
2. **Given** a usable shared runtime exists, **When** installation runs, **Then** it uses that runtime without unnecessary replacement.
3. **Given** missing, changed or unusable embedded inputs, **When** installation starts, **Then** it explains the failed operation and does not claim completion or replace foreign data.

### User Story 2 - Choose installation settings (Priority: P1)

The recipient sees a license screen, chooses current-user or all-users installation and its location, and independently chooses Start menu and PATH integration.

**Why this priority**: These are explicit owner requirements and determine subsequent ownership and maintenance.

**Independent Test**: Exercise both scopes, a custom path with spaces, all four integration combinations, and refusal to accept the license. Inspect actual installed files, registration and integrations.

**Acceptance Scenarios**:

1. **Given** a new installation, **When** the recipient navigates the wizard, **Then** license acceptance, scope, location and both integration choices are available before mutation.
2. **Given** current-user scope and optional integration disabled, **When** installation succeeds, **Then** only the selected user's chosen installation/integration is created.
3. **Given** all-users scope, **When** normal Windows authorization is declined, **Then** cancellation is reported and installation is not declared successful.

### User Story 3 - Observe and cancel installation (Priority: P1)

The recipient sees the current operation and progress, can request cancellation, and receives understandable completion or failure information.

**Why this priority**: Long dependency and application operations must have observable outcomes.

**Independent Test**: Observe native wizard progress during dependency provision and application installation, cancel an active operation, and inspect terminal registration/files independently.

**Acceptance Scenarios**:

1. **Given** runtime provision or application copying is active, **When** the recipient views progress, **Then** the current phase is visible without technical payload/descriptor prompts or fabricated percentages.
2. **Given** an active installation, **When** cancellation is accepted, **Then** it reaches an observable cancelled/recovered outcome, preserves foreign data and does not display success.
3. **Given** a failed operation, **When** the installer finishes, **Then** a concise error identifies the operation and a usable next action; diagnostic details remain available.

### User Story 4 - Maintain the selected installation (Priority: P2)

A recipient repairs, updates or removes the installed application using ordinary installation/system maintenance, preserving selected scope, path and integration choices.

**Why this priority**: A successful first install must remain consistent through its lifecycle.

**Independent Test**: Reopen the MSI, repair and replace an owned installation, verify retained choices, and remove it while retaining galleries, settings, shared dependencies and foreign extras.

**Acceptance Scenarios**:

1. **Given** a custom owned installation, **When** ordinary maintenance or replacement runs, **Then** its scope, location and integration selections remain effective without choosing internal files or JSON.
2. **Given** a supported published predecessor, **When** the new MSI performs an allowed same-scope update, **Then** it validates prior ownership and preserves data; an incompatible or ambiguous operation reports its conflict without forced migration.
3. **Given** uninstall, **When** removal completes, **Then** only unchanged application-owned files/integration are removed and shared runtimes/private user data/media remain.

### Edge Cases

- No network, absent runtime, existing adequate runtime, runtime install failure or cancellation.
- User scope without administrator rights; machine authorization refused; paths with spaces/non-ASCII text; unwritable or foreign destinations.
- Repeat install, both legacy scopes present, stale registration, changed owned bytes, another active installation, interrupted maintenance and rollback/recovery.
- Unselected integrations, foreign existing PATH/Start menu content, multiple users and scope ownership.
- Quiet/unattended native installation and maintenance must retain machine-readable exit/log behavior without bypassing integrity checks.

## Requirements

### Functional Requirements

- **FR-001**: Ordinary Windows Full delivery MUST be exactly one self-contained unsigned MSI, with no required companion installer, toolkit or manually selected internal MSI/JSON.
- **FR-002**: The MSI MUST include all currently bundled application dependencies and automatically detect/provision WebView2 from its bundled offline installer when required, with no dependency downloads.
- **FR-003**: The interactive installer MUST present license acceptance and both current-user/all-users scope choices before installation mutation.
- **FR-004**: The recipient MUST be able to select the installation location and independently enable/disable Start menu and PATH integration before mutation.
- **FR-005**: Installation MUST show its active phase and progress, including dependency provision; support cancellation; and show understandable terminal completion, cancellation and error outcomes.
- **FR-006**: Selected scope, location and integration choices MUST persist through repeat installation, repair, supported replacement and removal. Normal platform authorization applies to machine operations.
- **FR-007**: Existing native ownership, immutable input verification, concurrency, conflict refusal and retained recovery/rollback semantics MUST remain effective. Media, sidecars, portable/private settings, foreign extras and shared runtimes MUST not be removed by application maintenance.
- **FR-008**: User/machine updater storage and developer/fixture isolation MUST retain the S029 context contract; no profile-root legacy update folder or ordinary-profile fixture writes may return.
- **FR-009**: Quiet/native administration MUST support explicit installation choices and authoritative native return codes/logs while retaining the same dependency and ownership behavior.
- **FR-010**: Release assembly, canonical artifact metadata, schemas, download presentation and installation docs MUST describe the MSI entrypoint and preserve exact published v0.1.0/v0.2.0 records and bytes. Lite and non-Windows delivery are unchanged in behavior.
- **FR-011**: Software, current versioned documentation and master schemas MUST remain aligned at the unpublished source version; candidate changes MUST not be described as published software.
- **FR-012**: Required repository, unit, affected site/product and existing isolated native/package CI MUST pass. All local commands remain hidden/noninteractive; GUI/input/installer campaigns run only on isolated hosted desktops. Existing 660/900/15 timing and evidence boundaries remain.
- **FR-013**: S030 branch, feature directory, selector and tracking MUST agree. Push/open the official PR automatically, close #89 on merge, handle every review finding within at most two review rounds, then stop for owner final review/merge without tagging or publishing a release.

### Key Entities

- **Installation selection**: license acceptance, user/machine scope, absolute location, Start menu choice and PATH choice.
- **Installed identity**: native registration, exact application inventory, persisted selection and matching maintenance/recovery authority.
- **Bundled dependency**: embedded offline bytes and identity, observed installed state, provision phase and authoritative outcome.
- **Product artifact**: versioned Windows Full MSI and its release record; separately retained internal inputs are not additional product downloads.

## Success Criteria

### Measurable Outcomes

- **SC-001**: One copied MSI installs a working Full gallery offline on a declared supported Windows host with WebView2 initially absent.
- **SC-002**: Both scopes, a custom location and all four integration combinations are selectable and match installed registration/files/integration after installation and maintenance.
- **SC-003**: Active installation and dependency work has visible progress/cancellation; accepted cancellation and injected failures never produce a success claim or deletion of independent data.
- **SC-004**: Supported same-scope repeat/repair/replacement/removal preserves or intentionally removes the selected owned installation, with independent terminal readback and retained recovery authority.
- **SC-005**: All applicable final-commit checks pass; all received review findings are resolved; no more than two review rounds are requested; the PR is handed back unmerged.

## Assumptions

- #89 supersedes the pending source contract's system-only Windows Full EXE workflow. Existing published releases retain their own contracts.
- The Windows target remains x86_64. Existing framework/package tooling is reused where practical; implementation choices are resolved during planning research.
- New installs default to current-user scope, Start menu enabled and PATH disabled. Existing installs keep their saved choices; explicit administrative properties remain available.
- Shared dependency installation may survive a cancelled application installation; removal must not uninstall a shared runtime. Incomplete vendor work must be reported truthfully.
- Navigation overhaul #94, additional platforms, signing/notarization, migration of private state and release publication are outside S030.
- Automated engineering checks remain required. Owner product observations follow publication; no attended pre-release verification or extra approval gate is introduced.

## Clarifications

### Session 2026-11-04

- Autopilot: defaults resolve to current-user scope, Start menu on and PATH off, while all choices remain available and are persisted.
- Ordinary delivery is an MSI; retaining the current EXE wrapper or publishing the current dependency-incomplete inner MSI does not satisfy #89.
- Push and PR publication are explicitly authorized; merge/tag/release remain owner-controlled. No critical owner ambiguity remains. Architecture feasibility and supported native maintenance details are research tasks, not additional user prerequisites.
