# S015 Verification

## Planning and analysis

2026-10-27: Spec Kit specify/clarify/checklist/plan/tasks helpers ran against `codex/015-windows-packaging` and `specs/015-windows-packaging`. Three required plan research assignments completed read-only. No extension hooks are registered. Generated 23 dependency-ordered tasks, four user stories, 17 functional requirements and six measurable success criteria.

Read-only analyze used `check_prerequisites.py --json --require-spec --require-tasks --include-tasks` and compared spec, plan, tasks and constitution. Coverage is 17/17 FR and 6/6 SC; zero unmapped implementation tasks, unresolved architecture choices, duplicate requirements, critical/high findings or constitution conflicts. Scope, branch, directory and selector agree. Design explicitly distinguishes elected server evidence, controlled native runtime failure and physically clean provisioning. US1 is the initial increment; all four stories remain required for completion.

Implement prerequisites: built-in requirements checklist16/16; reviewer-owned packaging checklist0/12. Markers remain untouched. Owner's explicit autonomous continuation governs proceeding without an additional checklist pause. Existing git/Node/Rust ignore/configuration paths cover generated outputs; no publishing npm package or additional ignore technology is introduced. Implementation uses hidden processes; desktop/installer mutation is confined to isolated hosted CI.

## Evidence status

Implementation is present; hosted packaging/native qualification remains pending. No S015 review rounds requested yet. No product release/tag/merge is authorized.

## Local implementation verification

Three complete headless snapshots passed. Final product-code snapshotcffbbb6b85ef50159801ccbd6f974064a7519c6c3768d61b1c63b6baf5e4eb61 (1080 files) completed2026-10-27T23:01:52.796Z with preparation49.064s, qualification101.540s and combined150.604s. All eleven gates passed, including repository,93 Node tests, app/native units, site/browser/geometry, normal Full/Lite archive behavior, provenance and governed bytes. Windows-specific package support has three passing native units, including an actual write/delete-sharing lock regression that failed before its implementation. Both new PowerShell scripts passed the supplied compliance checker.

After that snapshot, only the isolated package harness/evidence reader added real portable-settings presentation/retention and screenshot/Refresh hash binding. Repository checks and all93 Node tests passed again. The complete snapshot is not relabelled as that later source; hosted CI must bind the exact pushed source. Installer execution, runtime provisioning and ordinary interactive candidate use have not run locally.

The first published campaign elected24 cases and five ordinary native windows (user Full, machine Full, in-place Lite, relocated/Refresh Lite and explicit-root Lite). Completion requires terminal green checks and review closure, not candidate build success.

## Review round1 and corrections

Official PR54 opened on20d1e7dfc94ae9c0c189a18f3fa54e6a809de021. Automatic review completed2026-10-27T23:06:59.818401Z with two findings (threadsPRRT_kwDOVUAZgc6w632d andPRRT_kwDOVUAZgc6w632r): Property-table text did not expand ARPINSTALLLOCATION, and user-visible runtime discovery did not establish machine-wide availability. Corrected MSI uses a formatted type51 action after CostFinalize. Candidate tests now elect the real default user destination and repeat/removal without --directory for both scopes. Empty owned nested directories receive explicit nonrecursive removal rows; a new reinstall-after-removal case exercises each scope, increasing the campaign to26 cases.

Runtime verification now reads the selected Evergreen registration, checks actual runtime files and calls the native loader against that exact registered folder. Machine scope cannot fall back to a per-user result. A native regression demonstrates a successful user probe cannot satisfy absent machine prerequisites, while user installation may use a shared machine runtime. The Microsoft Property-table and WebView2 distribution documentation directly support these corrections. Physical clean absence remains unelected; no host runtime was force-removed. Corrected-source qualification and thread closure are pending.

Corrected product-code snapshotc5503048c7681d64d573d0088872bf0939b73dd752fb38a57b1707798c711596 passed all eleven local gates, four native package units and93 Node tests: preparation52.821s, qualification104.594s, combined157.415s, terminal2026-10-27T23:15:28.963Z. A separate finite read-only local probe verified scope-specific native discovery against existing machine Evergreen155.0.4283.62 for both requested scopes; it performed no GUI, installation or provisioning. Subsequent hosted-only harness additions check actual native-path/scope records, measure the attributable shared runtime directory when available, and invoke cached product-code removal after reinstall. Repository/93-test checks pass those additions; exact-source hosted acceptance remains required. Round2 has not been requested.

## First hosted package producer correction

Run40599537122 on20d1e7d (tested merge0df233c8e9713e73d2c3e988878c94b5ae5a08af, source6bbd7b7cf8d109c4cfa66adb1a6b62ceae0095c2990968a4eb38ffaa22844f93) passed repository/website and the release Full/Lite application dependency audits, then rejected VCRUNTIME140.dll in the installer-support DLL. Package readiness was never accepted: preparation838.430s, qualification0s, terminal2026-10-27T23:18:49.829Z. No installer/native journey is inferred from that partial producer output.

Support-only builds now select explicit x86_64 MSVC and static CRT, retaining the system-DLL search flag and strict import/delay-import audit. A local hidden support-only compile and read-only PE inspection confirmed x64, no VCRUNTIME import, no delay imports and NotSigned; no installer or GUI ran. Repository/93-test checks pass. The superseded failed campaign and its pending successor are replaced by a fresh complete corrected-head campaign; review round2 remains unused until functional validation.

The first macOS scope also exposed the pure payload unit fixture's aliased system temporary parent. The test now supplies its canonical physical root, retaining redirect rejection; a deterministic Unix alias regression checks both outcomes. No product installation/root policy was relaxed. These failures were observed before stopping the obsolete campaign; its other incomplete native scopes are not accepted as final results.

## Compiler-only authoring and generation identity

The shared pure MSI authoring function now serves both production construction and a hidden compiler-only diagnostic. Both user/machine authoring variants compiled and linked locally with validation actions disabled; no MSI execution, install/uninstall, provisioning or GUI occurred. Actual package production, validation actions and recipient qualification remain isolated CI operations. This refines the initial CI-only compilation preference using the owner's explicitly allowed CREATE_NO_WINDOW/redirected-I/O boundary.

The machine common shortcut intentionally uses HKLM ownership rather than a per-user registry marker. Its specific ICE43 exception follows the documented rule for non-advertised shortcuts; native scope/shortcut checks remain mandatory. ICE38 covers deliberate native-verified file keypaths, and ICE64 excludes deleting the shared Programs parent. No broad CI validation bypass is introduced. Primary reference: https://learn.microsoft.com/en-us/windows/win32/msi/ice43.

The compiler also highlighted PackageCode uniqueness across rebuilds. Each producer now creates a fresh128-bit generation shared by paired payloads and hashes it into package identity, while ProductCode/component identities remain stable. Thus even an identical revision rebuilt into different MSI bytes cannot accidentally reuse a prior package identity. Final complete local snapshot3731840e012e447bbef4f6e883a6ce98d57ae14abe7e3baa56e14f6fc5150932 passed all eleven gates and93 Node tests: preparation49.783s, qualification102.949s, combined152.732s, terminal2026-10-27T23:32:31.307Z. Hosted26-case acceptance and review closure are still pending.

## Hosted machine shortcut scope correction

Run40602943972, tested merge5a581bd7ede157c28bdea79aae244c50fda96d0f on source3731840e, passed all five existing repository/site/native scopes. Packaging passed release application/helper audits and user MSI construction, then ICE57 rejected mixed classification of the machine shortcut component. No package readiness or installation acceptance was reached. Machine shortcut authoring now uses its own directory identifier, bound by MsiSetTargetPath to the actual common Programs known folder before mutations; HKLM ownership is retained. ICE57 remains enabled. Both corrected authoring variants pass hidden compiler-only linking, without validation actions or installer execution locally.

Optional Cargo restore/save now keys by job role, OS/architecture, actual runner image, lock/toolchain inputs and revision, with compiler validation and every existing build/native check retained. Cache errors are advisory; no functional gate is skipped. Cache input action v5 was resolved to immutable commitcaa296126883cff596d87d8935842f9db880ef25. Local snapshotda8852f6e5c5123d61ff45e52eabc477abfd9dd67a17c9fa48618118b583957e passes all eleven gates: preparation49.280s, qualification101.951s, combined151.231s, terminal2026-10-28T00:01:22.735Z.
