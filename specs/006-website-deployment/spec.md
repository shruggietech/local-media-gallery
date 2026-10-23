# Feature Specification: Public website deployment

**Feature Branch**: `codex/006-website-deployment`

**Created**: 2026-10-23

**Status**: Specified

**Input**: S006 completes GitHub issue #32 end-to-end under autopilot, including live deployment, automatic push and official PR, CI and at most two review rounds, stopping before owner merge. Remove superseded S005 delivery notes as requested.

## User Scenarios & Testing

### User Story 1 - Read the official website (Priority: P1)

A visitor opens localmedia.gallery and reads the landing page and every retained documentation version over verified HTTPS.

**Why this priority**: The completed website must be publicly usable at the owned official address.

**Independent Test**: Open HTTP and HTTPS entry points, verify canonical redirects and certificate identity, and crawl the deployed artifact's complete route and asset inventory.

**Acceptance Scenarios**:

1. **Given** a successfully qualified website artifact, **When** it is published, **Then** the live bytes match that artifact and all retained topics, references, search and assets work.
2. **Given** the pre-product baseline, **When** a visitor reads availability, **Then** it remains labelled as a specification without invented packages or download links.
3. **Given** an HTTP request, **When** the visitor follows it, **Then** the final destination uses valid HTTPS at the canonical apex.

### User Story 2 - Reconcile provider configuration (Priority: P1)

The maintainer runs a bounded deployment procedure that reuses the owned registration, preserves unrelated services and verifies actual provider and public DNS state.

**Why this priority**: Site availability requires correct domain ownership, authoritative routing and certificate readiness.

**Independent Test**: Read back registration, zone, nameservers, DNSSEC, domain verification, web records, Pages configuration and HTTPS enforcement; compare unrelated records and registrar settings before and after.

**Acceptance Scenarios**:

1. **Given** existing authorized access, **When** preflight runs, **Then** it identifies the actual registration, active authoritative zone, DNS/CAA policy and Pages state without logging credentials or contact data.
2. **Given** a missing zone or incorrect existing-domain delegation, **When** reconciliation is required, **Then** supported authorized provider operations repair it and public delegation is verified. A genuine account challenge remains an exact incomplete operation.
3. **Given** organization ownership verification and a repository domain assignment, **When** traffic records are reconciled, **Then** only the elected web records change, with no wildcard and no registrar lock, renewal, privacy or DNSSEC weakening.

### User Story 3 - Repeat and recover publication (Priority: P2)

The maintainer reruns publication without duplicate records or overlapping deployments and can restore the previous web configuration and checked artifact after a failed change.

**Why this priority**: Repeatability and attributable recovery make subsequent site maintenance practical.

**Independent Test**: Exercise no-op reruns, mismatched or unqualified artifact rejection, stale configuration rejection, failed readiness and conflict-aware rollback with small fixtures, then perform a live idempotent readback and reversible rollback drill.

**Acceptance Scenarios**:

1. **Given** unchanged desired records and settings, **When** reconciliation repeats, **Then** it reports no changes and preserves the ownership TXT record.
2. **Given** a failed check or artifact/source mismatch, **When** publication is attempted, **Then** deployment is rejected and no candidate is represented as successful.
3. **Given** a recorded change, **When** rollback is elected, **Then** only owned unchanged-since-application web records/settings are restored; concurrent unrelated changes are preserved.

### Edge Cases

- Missing or expired provider authorization; duplicate zones; unavailable authoritative servers; DNSSEC mismatch; incompatible CAA; delayed public DNS or certificate issuance.
- Existing apex conflicts, unrelated MX/TXT/service records, optional www exposure, pre-existing Pages deployment and concurrent configuration changes.
- Failed, forked, stale or mismatched qualification runs; unsafe artifact paths; absent inventory; bytes changed after qualification; failed or overlapping deployment.
- Missing retained routes, mixed content, redirected asset requests, wrong deployment identity or incomplete live verification.

## Requirements

### Functional Requirements

- **FR-001**: Preflight MUST verify owned registration, authoritative zone/delegation, DNSSEC, existing DNS/CAA, Pages and exact qualified artifact through authorized readback. Credentials and registrant contacts MUST NOT enter source or public evidence.
- **FR-002**: Reconciliation MUST reuse the owned registration and active zone, repairing missing zone/delegation only where needed and authorized. It MUST preserve registrar lock, renewal, privacy, DNSSEC and unrelated services. Purchases, transfers and billing changes are excluded.
- **FR-003**: Organization domain verification MUST use the generated TXT challenge, retain its record and confirm verified state. Pages MUST be assigned localmedia.gallery before routing traffic DNS.
- **FR-004**: Pages publication MUST use custom Actions deployment, scoped Pages/OIDC permissions, a deployment environment, serialized production operations and the exact qualified static artifact with source and byte identity evidence.
- **FR-005**: Web DNS MUST use current officially documented apex destinations and DNS-only records without wildcards. Existing unrelated records MUST remain unchanged. If www is exposed, its destination, apex redirect and certificate coverage MUST be verified.
- **FR-006**: Bounded checks MUST verify public and authoritative DNS, DNSSEC/CAA compatibility, certificate readiness, enforced HTTPS and HTTP-to-HTTPS behavior. A timeout MUST remain an incomplete result with attributable state.
- **FR-007**: Live acceptance MUST verify landing, every retained version/topic/deep route, assets, raw sources and deployment identity against the checked artifact, including browser behavior and absence of mixed content.
- **FR-008**: Reconciliation MUST produce an idempotent plan, before/after readback and conflict-aware rollback evidence without overwriting concurrent unrelated changes. Previous checked content MUST remain recoverable.
- **FR-009**: Existing repository, product and website checks MUST pass; qualification MUST retain preparation/readiness/terminal accounting, provenance and the established 660-second advisory target, 900-second hard limit and fifteen-second reserve.
- **FR-010**: Spec Kit artifacts, branch, feature selector and Project Slice MUST agree on S006. Automatic push and official PR are authorized, all actual review findings MUST receive a response and disposition, and no more than two review rounds may be initiated. Owner merge remains the final boundary.
- **FR-011**: Superseded S005 delivery notes identified by the owner MUST be removed from current repository records and the owner-controlled PR description without rewriting published Git history.

### Key Entities

- **Provider snapshot**: Relevant Pages/domain/zone/registration state and separately retained private configuration identifiers.
- **DNS change plan**: Desired elected web records, exact before values, attributable applied values and unrelated-record preservation evidence.
- **Qualified deployment**: Source revision, successful qualification run, static inventory, artifact byte digest and deployment identity.
- **Live acceptance record**: Terminal route/asset checks, DNS/TLS/provider readback, timings, rerun and rollback outcomes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: The official apex serves verified HTTPS content matching the qualified inventory; all inventoried public routes, assets and raw sources pass live acceptance.
- **SC-002**: Organization verification, repository domain assignment, authoritative/public routing and HTTPS enforcement are confirmed by readback; unrelated service and registrar settings are unchanged.
- **SC-003**: A second reconciliation is a no-op, and a reversible rollback drill plus conflicting-change fixtures preserve unrelated state and demonstrate restoration.
- **SC-004**: Every elected check is terminal green on the final PR revision, every actual review thread is handled within two rounds, and the owner receives a concrete PR for final review and merge.

## Assumptions

- GitHub Pages hosting and the existing Next.js static site are owner-approved choices. #6/#28/#29/#30 are merged prerequisites.
- Existing provider credentials are reused. No product release is cut; #31's release-linked promotion remains separate.
- The default domain is the apex. Optional www is configured only if already exposed or needed by the canonical-domain contract.
- Explicit deployment authorization permits a checked feature-branch artifact to be published before merge, with source identity recorded and automatic main publication after merge.
- Current Git history is retained; requested removal applies to current authored documentation and editable PR text.

## Clarifications

### Session 2026-10-23

- Q: Which hostname is canonical? → A: The owned apex localmedia.gallery; preserve and verify www only if exposed.
- Q: May the live site be published before merge? → A: Yes, the owner explicitly authorized end-to-end deployment while reserving final PR merge. Restrict the initial deployment to the authorized slice and require all qualification jobs.
- Q: What changes are allowed at the registrar? → A: Only required existing-domain configuration; preserve lock, renewal, privacy and DNSSEC, with no purchase, transfer or billing change. Current preflight already finds the existing active zone and correct assigned nameservers.
- Q: What is the rollback scope? → A: Exact owned web-record and Pages changes with compare-before-restore; retain prior checked artifacts and the organization ownership TXT.
