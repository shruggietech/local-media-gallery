# S020 research decisions

2026-10-31: platform research completed before implementation.

## Native owner remains authoritative

Windows same-version distinct PackageCode MSI reinstalls are documented, but component identities must remain stable and removal rules matter. Retain original full MSI, never rely on internal LocalPackage cache. Legacy helpers reject changed PackageCode, so explicit native uninstall/install may be necessary across legacy or changed inventories; record the recoverable gap. Sources: [small updates](https://learn.microsoft.com/en-us/windows/win32/msi/applying-small-updates-by-reinstalling-the-product), [REINSTALLMODE](https://learn.microsoft.com/en-us/windows/win32/msi/reinstallmode), [product codes](https://learn.microsoft.com/en-us/windows/win32/msi/changing-the-product-code), [LocalPackage](https://learn.microsoft.com/en-us/windows/win32/api/msi/nf-msi-msigetproductinfoexa), [rollback](https://learn.microsoft.com/en-us/windows/win32/msi/rollback-installation).

Debian calls old-prerm before new-preinst. Old-prerm can validate old hashes; new-preinst must validate incoming destination authority rather than compare old bytes with new hashes. Retain both .deb inputs and use native unpack/configure for recovery. Partial-state allowances must remain bounded to journal-authorized union(old,new) bytes and cannot report configured success. Source: [Debian maintainer scripts](https://www.debian.org/doc/debian-policy/ch-maintainerscripts.html).

macOS current receipt equality prevents distinct replacement. Separate prior-receipt identity validation, then retain verified prior bytes and stage new bytes with journal reconciliation. Use persistent OS file lock inode; never remove a lock merely because its owner timed out. Sources: [Rust rename](https://doc.rust-lang.org/std/fs/fn.rename.html), [Rust file locks](https://doc.rust-lang.org/std/fs/struct.File.html#method.try_lock), [Apple fsync](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fsync.2.html).

## Data compatibility

Reuse actual settings/portable/history validators through read-only finite probe. No new format needed: settings and portable format1/release0.0.0; SQLite applicationId0x4c4d4701/userVersion1 with exact schema. Unsupported bytes remain unchanged. Explicit recipient operands avoid pretending elevated root's profile covers every account.

## Candidate and failure evidence

Prepare two real controlled ordinary candidate generations with distinct owned package metadata/resources. Reuse ordinary compiled app when unchanged; record equal binary hash honestly. Real MSI/dpkg/direct transitions and ordinary native launch establish replacement. Label future-format and deliberate failure fixtures separately. Preparation owns compilation, archive construction and prerequisites; qualification owns actual transactions/readback.

Rejected alternatives: generic raw copying of native-owned Full files, whole Lite gallery replacement, script-runtime dependency on recipients, ephemeral-only backup, invented release/version, signing gates, timeouts treated as terminal process evidence.

## Implementation follow-up research

Apple declares renameatx_np RENAME_EXCL as0x4 and O_NOFOLLOW as0x100. Both leaf names are anchored to an open physical parent for same-filesystem exclusive displacement. Post-rename byte verification remains necessary because exclusive rename does not compare the source inode to an earlier observation. Receipt metadata checks are owner authority rules, not an assertion that POSIX mode excludes every ACL writer. Sources: [Apple stdio declarations](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/sys/stdio.h), [Apple fcntl declarations](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/sys/fcntl.h), [XNU VFS implementation](https://raw.githubusercontent.com/apple-oss-distributions/xnu/main/bsd/vfs/vfs_syscalls.c).

Windows private records require atomic security attributes, protected non-null DACLs, trusted ancestor deletion authority and machine Administrators ownership. Native MSI inspection binds actual ProductCode, PackageCode and ALLUSERS scope before staging. Sources: [Security descriptors for new objects](https://learn.microsoft.com/en-us/windows/win32/secauthz/security-descriptors-for-new-objects), [GetSecurityInfo](https://learn.microsoft.com/en-us/windows/win32/api/aclapi/nf-aclapi-getsecurityinfo), [CheckTokenMembership](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-checktokenmembership).

## Native feature repair refinement

[REINSTALL](https://learn.microsoft.com/en-us/windows/win32/msi/reinstall) selects case-sensitive features through a comma-delimited list. [REINSTALLMODE](https://learn.microsoft.com/en-us/windows/win32/msi/reinstallmode) forces only selected native work; retain vamus so equal-version and compatible rollback files are not silently kept by version comparison. Author three independent native groups and prove their actual table membership before selecting Application plus groups containing changed/missing files. Keep complete archive staging, full byte/ownership validation and native final verification. Unsupported layouts retain the established ALL behavior. No MSI-owned raw file writes or signature requirements are introduced.

## Windows proof collection throughput, 2026-10-31

The feature-group campaign restored all12 Windows transaction journals but hit the885s reserve while copying final Lite evidence. A controlled local four-tree19485-file comparison gives recursive cp6929/6690ms versus bounded exclusive copies3164/3337ms in both orders, with complete original/destination inventories and hashes equal. The unchanged1211-file verifier takes1143/1103ms serial versus209/215ms with eight workers, preserving every actual existing ancestor/size/hash check and explicit missing-file behavior. Apply these proportional maintainer-tool corrections while keeping all native scenarios, post-copy validators and deadlines. Local measurements do not substitute for hosted qualification.

## Linux settings observer readiness, 2026-10-31

Run41222052414 completed Full and Lite update/recovery campaigns but failed the relocated Lite portable-precedence assertion. The retained AT-SPI tree contains visible Open red.png with Show controls and Settings both disabled. The existing UI explicitly disables disclosure controls until settingsReady. Thus first media discovery is not settings-resolution readiness. Require an enabled showing disclosure together with the media action under the existing20s startup boundary, then assert the original expected portable override. The pure regression distinguishes transient disabled controls from both correct and wrong enabled values; a wrong enabled value still reaches and fails the precedence assertion immediately.

## Shared ordinary settings readiness, 2026-10-31

Source62c0e3d passes seven scopes, including the corrected Linux relocation case (qualification573.729s). Windows completes all three update/recovery campaigns, then fails relocated Lite portable presentation at833.197s, before the qualification cutoff. Its observer has the same first-media-only predicate as the original Linux observer, but did not retain the first control tree; an actual disabled-state observation cannot be recovered for this Windows failure. Share the enabled-control readiness guard across UIA, AT-SPI and AX observers, retaining the independent expected-portable assertion. Capture the last Windows tree on future failure. Apple defines [AXEnabled](https://developer.apple.com/documentation/applicationservices/kaxenabledattribute?language=objc) as whether the accessibility object permits interaction, including disabled buttons. Capture that existing native attribute for macOS rather than assuming settings are ready when media first appears.
