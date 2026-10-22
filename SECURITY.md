# Security policy

## Reporting

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/shruggietech/local-media-gallery/security/advisories/new). If that route is unavailable, use a private contact route listed on the [ShruggieTech website](https://shruggie.tech/). Do not post credentials, private media or exploit details in public issues.

Include the affected version or commit, operating system, a minimal reproduction, impact and relevant dependency versions. Remove credentials and private content. Maintainers coordinate fixes and disclosure; this project does not promise a response-time SLA.

## Supported versions

The repository contains an unreleased development application and the v0.0.0 specification baseline. No installable product package or supported application release has been published. Reports against the current default branch are welcome. A supported-version policy will accompany product releases.

## Data and dependencies

The current application browses selected local media without rewriting originals. Native filesystem access, renderer isolation, settings persistence and failure handling are covered by the [security and reliability contract](docs/v0.0.0/security-and-reliability.md). Requirements describe intended behavior; passing checks is not a claim that every contract or platform has been verified.

Maintainer tooling verifies imported brand archives and records their source, hashes and publication status. Dependency and executable-artifact integrity checks establish provenance for the identified inputs; they do not replace vulnerability review or runtime testing.
