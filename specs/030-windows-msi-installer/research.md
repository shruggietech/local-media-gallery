# S030 research decisions

## 2026-11-04: package and prerequisite

Adopt one dual-purpose MSI (ALLUSERS=2; MSIINSTALLPERUSER=1 initially), native custom WiX dialogs, editable location in both scopes, and independent StartMenu/CommandPath features. Resolve concrete scope after costing; never infer it solely from ProductCode. A canonical new identity coexists with recognition of both published legacy identities.

Microsoft's official [WebView2 WiX custom-action sample](https://learn.microsoft.com/en-us/microsoft-edge/webview2/samples/wv2deploymentwixcustomactionsample) embeds the complete offline installer and executes it before InstallFinalize. This supports a real self-contained MSI. [Single-package authoring](https://learn.microsoft.com/en-us/windows/win32/msi/single-package-authoring) defines ALLUSERS/MSIINSTALLPERUSER context selection. The existing EXE wrapper and unmodified inner MSI were rejected because they do not satisfy the issue.

Use a deferred custom action with embedded verified bytes. Machine provisioning runs without impersonation; user provisioning uses the invoking user's token and environment. CreateProcess does not inherit an impersonated thread token, so the user child must explicitly receive the caller token. All children hide consoles and disable interaction. Detect an adequate machine runtime for user installations; a user-only runtime cannot satisfy machine installation. Record actual runtime context.

Report detect/stage/vendor-install/verify phases through Windows Installer messages and progress records. Vendor work has no documented granular progress or cancellation protocol. Poll for cancellation, wait for bounded vendor completion and return native cancellation with application rollback. Do not claim that terminating the bootstrapper proves its service has stopped. Shared runtime can remain after cancellation/removal. Preserve diagnostic receipts on incomplete work and propagate reboot-required outcomes.

## 2026-11-04: ownership and compatibility

Persist selected feature states in MSI and native registration. Missing legacy feature names mean both integrations were installed. Maintenance must explicitly carry selected features; ADDLOCAL=ALL is prohibited as a fallback. Optional integrations are checked only when selected, so an unrelated foreign shortcut/PATH entry does not block an install that does not request it.

Native registration queries use actual ProductCode plus context. Same-context multiple recognized registrations are ambiguous. A physical dual MSI may have two concrete descriptors (user/machine) with identical hashes, ProductCode and PackageCode. Payload integrity, private root/lease and recovery journals remain concrete-scope authority.

Published predecessor custom actions cannot interpret a mixed new/legacy journal. Recovery must validate and remove the new installation using modern authority, then restore the actual retained legacy candidate through a compatibility authorization accepted by that predecessor. Any derived compatibility authority must bind actual legacy bytes/identities and preserve the original journal; never invent a legacy identity for new bytes. Preserve independent extras and private state, including interrupted recovery.

## 2026-11-04: contracts and qualification

Current source is unpublished 0.2.1. Change its Full format to MSI in version-aware release tooling/schema/docs. Preserve 0.1.0 ZIP and 0.2.0 EXE published contracts. Public download availability remains tied to published canonical release metadata. Lite remains EXE.

Use the existing isolated hosted Windows campaign for real wizard input, offline runtime provisioning, scope/location/integration matrix and lifecycle proof. Read actual MSI tables and terminal registration independently. Local verification uses hidden noninteractive commands only. Read upstream consumer contract and implementation guidance before native visual assets; use platform system typography and existing approved icon/identity, with renderer metadata documenting native constraints. Do not change governed kit bytes.

## 2026-11-04: first review corrections

Explicit known-folder token handles require QUERY, IMPERSONATE and DUPLICATE rights, as documented by [SHGetKnownFolderPath](https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shgetknownfolderpath). A read-only native-folder regression covers this access.

The writer-state check runs in a separate deferred impersonating action for both scopes. Privileged machine verification reads and retains owned bytes without executing the installed application. A shared hidden child launcher captures the effective caller token, creates its primary-token child with the caller environment, restores impersonation after the service creates the child, and restricts captured standard handles to an explicit inheritance list. Ordinary process creation is used only when no thread impersonation exists. Executable and directory handles remain pinned through the writer check; retained root updater bytes use the declared payload identity.

## Retained source authorization

Matching MSI identifiers does not authenticate a writable OriginalDatabase path. Final authoring stores a canonical content manifest in a dedicated MSI stream, covering persisted schemas/rows, other binary and CAB streams, embedded storages and execution-critical summary fields. Only the manifest stream excludes itself; its exact bytes must match the manifest read from MsiGetActiveDatabase during Preflight. Source verification uses the authored on-disk schema and avoids costing/UI temporary columns. Preflight seals the complete verified file hash/size into overwritten CustomActionData. Deferred retention pins physical parents and opens those exact bytes without write/delete sharing before publication. This permits unsigned offline delivery without trusting mutable identifiers or adding a signing gate.

The source manifest is sealed once during final package authoring, then the ordinary MSI artifact hash is computed. It is not generated or accepted from the recipient source during installation. Same-identifier source mutation and post-Preflight replacement must fail before machine maintenance authority is granted.

Primary references: [MsiGetActiveDatabase](https://learn.microsoft.com/en-us/windows/win32/api/msiquery/nf-msiquery-msigetactivedatabase), [streams table](https://learn.microsoft.com/en-us/windows/win32/msi/-streams-table), [persistent columns](https://learn.microsoft.com/en-us/windows/win32/msi/-columns-table), [Feature temporary columns](https://learn.microsoft.com/en-us/windows/win32/msi/feature-table), [embedded storages](https://learn.microsoft.com/en-us/windows/win32/msi/-storages-table), [single package authoring](https://learn.microsoft.com/en-us/windows/win32/msi/single-package-authoring).

## Native command grammar follow-up

The hosted quiet-repetition attempt at c1eb260 timed out after 240 seconds without creating an MSI log, after native wizard installation, browsing and bundled thumbnails succeeded. The maintainer serializer quoted switches as well as operands. Canonical invocations now leave switches bare, distinguish source/log operands containing equals from public properties, and retain explicit empty-property values. A guarded isolated readiness probe requests an intentionally absent package and requires native error 1619 plus a nonempty verbose log before expensive compilation; it does not request installation of a product. Full product maintenance acceptance remains required.

Primary references: [Microsoft Installer command-line options](https://learn.microsoft.com/en-us/windows/win32/msi/command-line-options) and [public property values](https://learn.microsoft.com/en-us/windows/win32/msi/setting-public-property-values-on-the-command-line).
