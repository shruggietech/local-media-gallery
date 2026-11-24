# Agent instructions

## Owner-directed collaboration

Treat the owner as a capable collaborator who defines intended product behavior. Exercise engineering judgment and explain deviations. Do not silently narrow the product or introduce eligibility checks, approvals, moderation systems or unrelated prerequisites based on hypothetical misuse. Separate approved requirements, technical necessities, recommendations and limitations on assistance. Unapproved reports are not binding requirements. Identify any operation you cannot perform before editing, and obtain agreement before materially reducing scope.

Finish authorized work autonomously. Report changed behavior, performed checks, unverified behavior and remaining deviations with concrete references. Plans, partial implementations and passing unrelated tests do not constitute completion.

## Project authority

Read `.specify/memory/constitution.md` and the current documentation under `docs/`. v0.0.0 remains a specification baseline. Current product command and package availability claims must match implemented behavior and actual verified canonical release records; pending candidates are not shipped products. Use Spec Kit for iterative slices and GitHub Issues, milestones and Projects as the primary tracking system once published.

Keep public documentation and planning self-contained. Do not cite private external design material or carry source-specific names, corpora, paths, prompts or eligibility rules into the product. Upstream owns the brand; read `brand/kit/enforcement/consumer-contract.json`, `brand/kit/enforcement/IMPLEMENTATION.md` and relevant upstream guidance before applying it. Update governed kit bytes only through `scripts/sync-brand-kit.mjs`.

Official documentation states authoritative system contracts. Keep slice codes and implementation evidence in internal `specs/` planning, and historical/version-change prose in `CHANGELOG.md`. Do not render or link numbered planning and tracking artifacts from the public documentation. Keep one concise specification-status statement in the documentation index. Once a documentation site exists, render the master changelog and JSON contracts within it. Its framework remains an owner decision.

Once product and schema contracts exist, the software, versioned documentation and master JSON Schema MUST share the release version. Prefer backward and forward compatibility where practical without treating either as an absolute promise. Explain breaking changes in the changelog and concise release notes. For every major release, rescan all documentation for technical terms and refresh the glossary with precise definitions, external primary learning references and local usage links.

## Quality and file integrity

Identify poor logic and fix or propose a proportional improvement. Do not replicate bad code during porting or refactoring. Save UTF-8 without BOM, LF line endings, and check for mojibake before delivering files. Keep Markdown soft-wrapped. Use numbered steps for a purely linear procedure; use diagrams for meaningful branches, relationships, dependencies, feedback or retry paths, keeping Mermaid flowcharts top-down. Sequence plans and update logs chronologically. Avoid unnecessary em-dashes and canned rhetorical contrasts.

## Windows execution

Foreground, flashing or focus-stealing console windows are prohibited. Direct Git and GitHub operations through the headless command runner are allowed. Batch compatible read-only checks. Before unverified non-Git console tooling, use repository-aware APIs, direct file tools or a launcher guaranteeing `CREATE_NO_WINDOW` and redirected noninteractive I/O. Stop a launcher that produces visible windows and continue unrelated verified paths. Project child launchers must hide console windows and disable prompts.

## Workflowy

This project opts into the `workflowy` skill and Workflowy Desktop MCP for
substantive work. Load the skill when available. A running, signed-in desktop
app with Local MCP enabled and a connected agent session is required.

- Read **AI Agent Workspace → ABOUT** and locate the project under **PROJECTS**.
  Reuse its branch or insert it alphabetically. Use **PROJECTS → _general** for
  work without a named project. Confirm the destination before writing.
- Keep named projects in `info`, `notes`, and `spec-kit` when the project uses
  Spec Kit. Keep `info` current and link its claims to evidence. Use `notes` for
  candid drafts, decisions, questions, and sessions in chronological order.
  Start each major session and substantive update title with one local
  ISO 8601 timestamp and its offset, followed by a short fragment. Keep
  updates and replies with their session or discussion.
- Put each formal slice directly under `spec-kit` in code order. Its title
  contains only the formal code and short title, like `S094 Check source order`.
  Add a `Date` child and an `Epic` child when applicable. Put scope, outcome, and
  links in children. Use the native Workflowy date and project hashtag
  together on the timeline child for dated records.
- Find the existing record by meaning and source before writing. Link to
  the exact finding or authoritative Git, tracker, or project artifact.
  Add new evidence or a delta in place and preserve the original node ID.
  Follow ABOUT for shared catalog fields, alphabetical order, and link roles.
- Keep private work with the operator and their authorized agents. The
  operator decides what is published. Read back MCP edits and check titles,
  parents, order, links, dates, and duplicates. If MCP is unavailable,
  continue the work and report what still needs to be saved.

## Verification and publication

Run `npm run check`, `npm test` and the affected site/product checks. Target eleven-minute (660-second) qualification after verified prerequisite readiness, with a fifteen-minute (900-second) hard limit. Target-only overruns are advisory and do not block otherwise valid acceptance or merge. Preserve the fifteen-second provisional finalization reserve, terminal timestamp authority, separate preparation/qualification/combined accounting, and mandatory functional, integrity, provenance and elected checks. User observations normally follow releases as issues; do not invent an attended pre-release verification gate. Follow the owner-approved squash merge and branch-deletion model. Release notes are short highlights ending with a link to `CHANGELOG.md`. No first push or GitHub publication is authorized by the local foundation request.
