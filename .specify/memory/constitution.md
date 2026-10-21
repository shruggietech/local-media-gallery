# Local Media Gallery Constitution

## Core Principles

### I. Owner-directed scope

The owner defines intended product behavior. Agents MUST explain engineering tradeoffs and MUST NOT silently narrow requirements or add usage restrictions based on hypothetical misuse. Framework, runtime, platform and distribution decisions MUST remain open until agreed with the owner. Existing projects are examples, not authority.

### II. Proportional implementation

Work MUST proceed in observable, bounded Spec Kit slices. Implementation plans MUST follow agreed behavior. Existing poor logic MUST be identified and corrected or proposed for correction within proportionate scope. Scaffolding MUST NOT introduce an application architecture or feature requirements merely to fill directories.

### III. Data and delivery integrity

Authored text MUST use UTF-8 without BOM and LF. Checks MUST detect corruption. Upstream brand bytes MUST be imported through the updater with manifest verification and recorded provenance; candidate and formal-release origins MUST remain distinguishable. UI work MUST read and follow the applicable delivered brand contract.

### IV. Truthful verification

Changes MUST pass repository checks, tests and applicable site/product checks. Evidence MUST distinguish maintainer-tool checks, runtime behavior, hosted CI and user observations. Passing foundation checks MUST NOT be presented as implemented or tested gallery functionality. Windows console children MUST be hidden and noninteractive with redirected I/O.

### V. Local publication boundary

Local scaffolding and commits are authorized. Remote creation, first push and publication MUST wait for owner authorization. After publication, GitHub Issues, milestones and Projects MUST provide primary tracking. Squash merges and merged-branch deletion MUST follow owner authorization. No attended pre-release gate may be invented.

## Project Scope and Documentation

Local Media Gallery's approved direction is a lightweight, interactive gallery for browsing local images and videos. v0.0.0 is a specification and maintainer-tooling baseline. No installable product is claimed. Node maintainer tooling does not select the application stack.

Public documentation MUST describe authoritative contracts and remain self-contained. Numbered planning artifacts and implementation evidence stay in `specs/`; historical changes stay in `CHANGELOG.md`. The documentation index keeps one concise specification-status statement. A future documentation website MUST render the master changelog and JSON contracts without exposing numbered tracking artifacts.

Software, versioned documentation and the master JSON Schema MUST share each release version once these contracts exist. Compatibility is preferred where practical; breaking changes MUST be explained. Major releases MUST refresh the glossary with precise definitions, primary learning references and local usage links.

## Development Workflow and Qualification

Use the installed Spec Kit commands to specify, clarify as needed, plan, generate tasks and analyze before implementing a slice. Keep unresolved architecture choices explicit. Run `npm run check`, `npm test` and affected site/product checks. Functional, integrity, provenance and elected checks are mandatory.

Release qualification starts after verified prerequisite readiness. Target 660 seconds, enforce a 900-second hard limit, retain a fifteen-second provisional finalization reserve and use terminal completion timestamps as authority. Target-only overruns are advisory. Record preparation, qualification and combined elapsed time separately. User observations normally follow releases as versioned issues.

## Governance

Current explicit owner instructions govern conflicts. Agents MUST surface conflicts and explain deviations. Amend this constitution deliberately with the rationale, version change and affected artifacts recorded in the changelog. Use major versions for incompatible principle changes, minor versions for added governance and patches for clarification. Review each slice against applicable principles without turning unapproved suggestions into new requirements.

**Version**: 1.0.0 | **Ratified**: 2026-10-21 | **Last Amended**: 2026-10-21
