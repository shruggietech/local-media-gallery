# Security policy

## Reporting

Report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/shruggietech/local-media-gallery/security/advisories/new). If that route is unavailable, use a private contact route listed on the [ShruggieTech website](https://shruggie.tech/). Do not post credentials, private media or exploit details in public issues.

Include the affected version or commit, operating system, a minimal reproduction, impact and relevant dependency versions. Remove credentials and private content. Maintainers coordinate fixes and disclosure; this project does not promise a response-time SLA.

## Supported versions

Published products and their exact platform/edition scope are identified by the verified canonical [GitHub Releases](https://github.com/shruggietech/local-media-gallery/releases). Reports against published versions and the current default branch are welcome; include the exact downloaded version or source commit. The current v0.2.2 source candidate is unpublished until its matching release is observed. The v0.0.0 specification baseline is not an installable product.

Use the documentation matching the downloaded release for behavior, dependencies and compatibility limits. Publication and qualification records establish the observed scope of each release.

## Data and dependencies

The current application browses selected local media without rewriting originals. Native filesystem access, renderer isolation, settings persistence and failure handling are covered by the [current source security and reliability contract](https://github.com/shruggietech/local-media-gallery/blob/main/docs/v0.2.2/security-and-reliability.md). Requirements describe intended behavior; passing checks is not a claim that every contract or platform has been verified.

Maintainer tooling verifies imported brand archives and records their source, hashes and publication status. Dependency and executable-artifact integrity checks establish provenance for the identified inputs; they do not replace vulnerability review or runtime testing.
