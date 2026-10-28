# S015 Research and Decisions

2026-10-27: Three plan-required read-only research tasks covered installer authoring, shared runtime and ordinary recipient evidence. No tracked files or owner-workstation installation/GUI/runtime state were changed by those tasks.

## Standard installation engine

Select two scope-specific MSIs with thin prerequisite entrypoints. Windows Installer owns file copy, transactions, registration and removal. Its [RemoveFile table](https://learn.microsoft.com/en-us/windows/win32/msi/removefile-table) supports removal of named files and empty directories, preserving unrelated extra content. The [Environment table](https://learn.microsoft.com/en-us/windows/win32/msi/environment-table) supports owned PATH segments instead of replacing PATH.

A [single dual-purpose MSI](https://learn.microsoft.com/en-us/windows/win32/msi/single-package-authoring) is possible but adds scope-dependent custom-action and component conditions. Two explicit variants keep user/machine identities and privileges observable. Stock Tauri NSIS can discover and execute registry uninstall strings before its preinstall hook, and its both-scope mode requests highest privileges. Stock Tauri MSI is machine-scope with user markers and upgrade behavior unsuitable for this slice. Do not copy these behaviors. References: [NSIS source](https://github.com/tauri-apps/tauri/blob/7e39750cf6a4e05234a781088ff5fb8cb890370a/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi), [MSI source](https://github.com/tauri-apps/tauri/blob/7e39750cf6a4e05234a781088ff5fb8cb890370a/crates/tauri-bundler/src/bundle/windows/msi/main.wxs).

WiX3.14.1 is the pinned upstream Tauri tooling input, not an unspecified latest tool. Official asset158158052 is41297555 bytes, SHA2566ac824e1642d6f7277d0ed7ea09411a508f6116ba6fae0aa5f2c7daa2ff43d31. Record that WiX3 is archived. Sources: [Tauri pin](https://github.com/tauri-apps/tauri/blob/7e39750cf6a4e05234a781088ff5fb8cb890370a/crates/tauri-bundler/src/bundle/windows/msi/mod.rs), [official release](https://github.com/wixtoolset/wix3/releases/tag/wix3141rtm).

## Ownership and terminal result

Use registered product/package/component identity plus actual destination, file and integration observations. Do not identify ownership by executing unknown files or registry uninstall strings. Immediate preflight is read-only; the standard installer performs mutations. Deferred verification observes actual copied files and integration before final commit. [Deferred action context](https://learn.microsoft.com/en-us/windows/win32/msi/obtaining-context-information-for-deferred-execution-custom-actions) is explicitly passed through CustomActionData. No automatic MajorUpgrade is enabled; broader recovery is #25.

Use approved names/icons and preserve source kit bytes. Existing command integration must be actual PATH resolution in a fresh registry-derived environment; App Paths alone is insufficient. Scope-specific registrations and owned directory segments must survive foreign-collision tests without changing unrelated values.

## Shared runtime

Preserve shared Evergreen. Microsoft [distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) documents bootstrapper execution and scope behavior, including possible promotion to machine scope by an existing updater. Pin the observed immutable [bootstrapper](https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/4a41d80d-4493-4463-a466-d0988b97f1c4/MicrosoftEdgeWebview2Setup.exe):1888472 bytes, SHA256ca4c9016c70e2184c5e231662e0e98abf4826647180ef3faab32fcb1ca2ec15e, version1.3.303.7, device-selecting x86 PE. Require a valid Microsoft signature during CI staging; the research download did not evaluate Authenticode. This pins the bootstrapper, not the Evergreen version it downloads.

Do not force-remove an OS-required component: Microsoft's [Server guidance](https://learn.microsoft.com/en-us/troubleshoot/microsoft-edge/development/webview2-unexpected-install-windows-server) explains required WebView2 on some Server/RDS configurations. A process-local browser-folder override produced a real native API unavailable result and actionable existing guidance using finite capabilities only. Elect that controlled negative case, actual vendor execution/idempotency and post-verification; do not label it clean-machine absence/provisioning. [Native API](https://learn.microsoft.com/en-us/microsoft-edge/webview2/reference/win32/webview2-idl?view=webview2-1.0.2478.35).

Observed debug proof imports contain Windows/UCRT DLLs and no VCRUNTIME/MSVCP imports. Audit new release/helper imports rather than inferring an unnecessary Redistributable. Linker [system DLL search flags](https://learn.microsoft.com/en-us/cpp/build/reference/dependentloadflag?view=msvc-170) are appropriate for declared system-only dependencies. No application-specific helper DLL may be silently omitted.

## Recipient evidence and process isolation

Add a separate required windows-packages VM/job. Preserve all existing S014 gates and one coherent package readiness/660s target/900s hard/15s reserve campaign. Build release candidates explicitly; existing buildEditions defaults to debug. Use ordinary shipped binaries with external UIA invocation and native pixel observations, not WebDriver hooks. Sources: [UIA InvokePattern](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.invokepattern.invoke), [PrintWindow behavior](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-printwindow).

Normal builds ignore native-test settings overrides and share actual user state. Record that state before/after removal, not before browsing. Lite's root is its executable's parent, so its executable stays at ZIP root. Current payload assembly already contains license/notice inventory and no FFmpeg payload; video preparation uses an explicitly selected helper. Correct stale proof prerequisite prose rather than carrying it into candidates.

Merged-main S014 exposed a preparation-driver startup failure after31 browsing cases passed. Existing older harnesses share default browser profiles, choose random ports and one does not await final owned child exit. Correct those observable lifecycle weaknesses proportionally, retain all assertions/deadlines and add process/output diagnostics rather than guessing a product failure or weakening acceptance.
