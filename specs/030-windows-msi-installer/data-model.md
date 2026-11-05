# S030 data model

## Installation selection

Resolved scope is exactly user or machine. INSTALLDIR is an absolute nonredirected elected location. StartMenu and CommandPath are independent Boolean feature states. New install defaults: user, StartMenu on, CommandPath off. Existing installation selections take precedence during maintenance unless explicitly changed. License acceptance is required in interactive flow; unattended administration supplies explicit acceptance.

## Native identity

A payload-derived ProductCode and deterministic dual PackageCode identify each physical MSI generation. ProductCode uses the domain-separated digest of `product:` plus the payload SHA-256; PackageCode uses the payload SHA-256 directly. One stable UpgradeCode identifies the dual-purpose family, including same-version replacement generations. An internal descriptor always includes concrete effective scope. Recognize published user and machine ProductCodes as legacy identities; inspect actual registration in its concrete context. Multiple recognized registrations in the same context are a conflict. Package inspection declares dual capability while maintenance authorizes only the elected concrete scope.

## Ownership state

Existing payload inventory/hashes, install directory, native identity and retained source remain authoritative. Integration choices are persisted with registration and queried from MSI feature states. Legacy installations without the new optional features imply both integrations enabled. Extend private state within the existing sealed envelope rather than changing its six top-level identity fields.

## Dependency operation

Pinned embedded runtime bytes/hash, elected context, detected runtime state, real phase, vendor result, cancellation request, terminal readback and possible reboot requirement. Shared runtime is never owned for uninstall. Incomplete work retains a diagnostic receipt and prevents a false success.

## Artifact

Current Windows Full format is msi; Lite is exe. Internal per-context native descriptors may reference identical Full MSI bytes. Historical release formats are selected by version, not globally rewritten.
