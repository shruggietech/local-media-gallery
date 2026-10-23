# Local Media Gallery technical specification

v0.0.0 is an unreleased specification baseline with a local Rust/Tauri gallery implementation and a live website at https://localmedia.gallery; installable Full/Lite packages have not been published.

Local Media Gallery presents local images and videos through a Rust/Tauri application with a statically exported Next.js interface. Full installation provides system integration and persistent user state. Lite provides lightweight, on-demand directory browsing and gallery sharing on supported hosts. The product targets Windows, Linux and macOS.

## Reading order

| Chapter | Document | Primary question |
| --- | --- | --- |
| 1 | [Overview](overview.md) | What behavior and editions does the product promise? |
| 2 | [Architecture](architecture.md) | Which components own discovery, state, presentation and platform integration? |
| 3 | [Installation and distribution](installation-and-distribution.md) | How are Full and Lite delivered, installed, updated and removed? |
| 4 | [Gallery lifecycle](gallery-lifecycle.md) | How does a directory become a current, movable gallery? |
| 5 | [Browsing and playback](browsing-and-playback.md) | How do users navigate, inspect and play media? |
| 6 | [Metadata and sidecars](metadata-and-sidecars.md) | How is optional metadata associated and presented? |
| 7 | [Configuration and state](configuration-and-state.md) | Which preferences travel, and which state belongs to a machine? |
| 8 | [Interfaces and contracts](interfaces-and-contracts.md) | What behavior crosses command, host and data boundaries? |
| 9 | [Thumbnails and performance](thumbnails-and-performance.md) | How does optional preparation improve browsing at practical scale? |
| 10 | [Security and reliability](security-and-reliability.md) | How are access, integrity, failure and recovery handled? |
| 11 | [Website and documentation](website-and-documentation.md) | How do the independent landing page and versioned docs work? |
| 12 | [Verification and compatibility](verification-and-compatibility.md) | What evidence is needed to accept a release and its documentation? |

[Glossary](glossary.md) defines the shared vocabulary. [Brand integration](brand.md) describes the delivered identity and its maintainer workflow. The master [changelog](../../CHANGELOG.md) records history rather than restating contracts here.

## How to interpret requirements

Uppercase MUST, MUST NOT, SHOULD, SHOULD NOT and MAY carry the requirement meanings defined by [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119.html) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174.html). Other prose explains intent. Requirement identifiers such as OV-01 are stable cross-reference labels, not implementation tasks or delivery schedules.

Requirements describe the intended system. Examples marked illustrative or proposed do not finalize command names, wire layouts or defaults. An unresolved decision names an unsettled choice and the evidence or approval needed to settle it. A recommendation does not become mandatory merely because an example uses it. Implementation and verification claims require separate evidence.

Public chapters are self-contained contracts. Development plans and verification logs remain internal. Their absence from the website is intentional; their contents must not be required to understand a public contract.

## Open decisions

Each entry has one owning chapter. It must be resolved, or explicitly excluded from a particular release's claim, before the affected behavior is advertised as supported. Unrelated work may proceed.

| ID | Decision still open | Owning chapter |
| --- | --- | --- |
| U-01 | Minimum OS versions, CPU architectures, Linux support baseline and exact runtime/package combinations | [Installation and distribution](installation-and-distribution.md#open-decisions) |
| U-02 | Full/Lite capability and dependency matrix beyond their agreed launch/state roles | [Overview](overview.md#open-decisions) |
| U-03 | Default recursion, symlink traversal, nested galleries and network/removable-drive support boundaries | [Gallery lifecycle](gallery-lifecycle.md#open-decisions) |
| U-04 | Tested image/video codecs, formats, orientation/color handling and unsupported-media actions | [Browsing and playback](browsing-and-playback.md#open-decisions) |
| U-05 | Richer preview/autoplay behavior and additional navigation/customization beyond the defined browsing defaults | [Browsing and playback](browsing-and-playback.md#open-decisions) |
| U-06 | Sidecar matching precedence, directory-wide indexes, duplicate-key handling and curated field mappings | [Metadata and sidecars](metadata-and-sidecars.md#open-decisions) |
| U-07 | Future portable settings and state-scope precedence, history/cache locations, SQLite adoption, decay and migrations | [Configuration and state](configuration-and-state.md#open-decisions) |
| U-08 | Executable/subcommand names, exact exit codes, IPC layouts, identifiers and application-schema dialect | [Interfaces and contracts](interfaces-and-contracts.md#open-decisions) |
| U-09 | Thumbnail encoders, video frame selection, portable cache placement and optional media-tool distribution | [Thumbnails and performance](thumbnails-and-performance.md#open-decisions) |
| U-10 | Benchmark fixtures, reference hardware, time/memory/package budgets and adaptation thresholds | [Thumbnails and performance](thumbnails-and-performance.md#open-decisions) |
| U-11 | Diagnostic fields, export/redaction defaults, log retention and exceptional recovery actions | [Security and reliability](security-and-reliability.md#open-decisions) |
| U-13 | Exact initial editing actions and their confirmation, undo and write behavior | [Overview](overview.md#open-decisions) |

### Resolved decisions

| ID | Resolved contract | Owning chapter |
| --- | --- | --- |
| U-12 | Static rendering, local search, version metadata, aliases and explicit archive corrections | [Website and documentation](website-and-documentation.md#rendering-and-snapshot-contract) |

## Document maintenance

These Markdown files are the versioned source for the live documentation website. Maintain one authoritative definition for each contract and link to it from other chapters. The independent landing page has its own content and layout outside this versioned tree. Software, documentation and application-owned master JSON Schema versions must align when those artifacts are released together; external sidecars remain free-form.

The chapter structure draws on [arc42](https://docs.arc42.org/home/) for architecture coverage and [Diataxis](https://diataxis.fr/) for separating reference, explanation and eventual task-oriented guidance. These are organizational references, not claims of certification or obligations to reproduce a template.
