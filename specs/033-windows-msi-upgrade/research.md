# Research: ordinary Windows MSI upgrade repair

## 2026-11-06: initial evidence and coverage

Decision: retain the actual published pair as baseline and exercise the ordinary full-UI journey separately from advanced recovery. Rationale: existing single-file qualification only performs ordinary quiet v0.1.0 upgrade; v0.2.0 uses the updater. wizardInstall assumes fresh user/default feature choices. Alternatives: rerunning the existing matrix would repeat that gap; local owner installation testing would violate workstation isolation.

Decision: use the existing registered Windows desktop diagnostic workflow on isolated Windows Server 2025 with a new explicit mode. Rationale: no repository self-hosted runners are registered; exact released inputs can be acquired without a Rust/application rebuild. Native MSI dialogs and actual logs are required. A passed Server case cannot establish Windows 11 behavior.

Decision: investigate directory attributes, costing and launch context before selecting a fix. Rationale: the exact old preflight calls MsiSetTargetPathW for MachinePrograms even on installed-product removal, supplies a path without the documented trailing separator, and reports the observed error. Microsoft documents read-only target failure and warns against reconfiguring already-installed components. The new parent uses ProgramMenuFolder. Read-only owner observation shows CommonPrograms has ReadOnly, Directory and NotContentIndexed attributes. These are hypotheses for controlled isolated cases, not proven root cause.

Sources: [MsiSetTargetPath](https://learn.microsoft.com/windows/win32/api/msiquery/nf-msiquery-msisettargetpatha), [Directory table](https://learn.microsoft.com/en-us/windows/win32/msi/directory-table), existing native source and two read-only Spec Kit research agents. No installed owner state or published artifact was changed.

## Planned causal gate

First retain exact baseline logs and dialog trees. Evaluate a native directory-row/costing compatibility correction if it is the demonstrated boundary. Evaluate sequence/token behavior only under controlled changed inputs. Reject any option that merely hides the old ownership guard, alters published inputs or requires user removal. Record resolved observations and repair choice here before changing production behavior, reanalyzing materially changed design.

## 2026-11-06: isolated attribute controls

Corrected baseline run 42221938823 completed both ordinary full-UI upgrades with native exit 0 under the elevated runner account, with CommonPrograms attributes 8208 and 8209. The ReadOnly directory flag alone is therefore not the demonstrated cause on that Server host, and no attribute adapter is justified. Next controlled case uses the same account's actual linked limited token, with actual child-token readback. Isolated native administrator consent is automatically approved only in the disposable diagnostic fixture and its original policy is restored; this does not claim attended consent-prompt or Windows client coverage. A missing native split token must be retained literally, not relabeled actual UAC proof.

## 2026-11-06: chosen native compatibility direction

A genuine limited MSI client reproduced the exact old MachinePrograms 267 modal, while elevated controls passed. The old immediate action requires machine-directory access before it should modify any directory, and published bytes are immutable. Choose an authenticated UI-only native administrator handoff before ExecuteAction for recognized legacy machine upgrades. The elevated child uses the same pinned MSI, repeats all current ownership/source checks and performs the one native replacement. Return native skip-remaining-actions only after actual child success; propagate cancellation and reboot status and retain failures. Per-user, current dual-package maintenance, quiet, removal and explicit recovery paths keep existing behavior.

The UI action authenticates OriginalDatabase against the active session and retains physical ancestor/file pins through child use. Use absolute system msiexec, native runas authorization and a COM/message-aware wait. Human wizard dwell time is not an arbitrary product timeout. Native qualification remains bounded by the existing test clock. Same-user administrator consent is the reproduced case; alternate credentials change the actual MSI client identity, so do not infer initiating-profile compatibility from that test. No command-line profile/PID can bypass state or ownership checks. Historical user media/private bytes remain untouched by the handoff.

Sources: Microsoft ExecuteAction, Custom Action Return Values, MsiSetMode, ShellExecuteEx and CoWaitForMultipleHandles documentation. A read-only design review confirmed the pre-execution boundary, required lifetime pins, cancellation/reboot mapping and identity coverage limit. Scoped legacy servicing, cache edits, guard suppression and directory attribute changes are rejected as broader or unsupported.

## 2026-11-06: native actor evidence

The fixture must observe the authorized wizard actor rather than infer elevation from requested launch flags. Record native MSI-window PID, token SID/type/elevation, and compare the same-user consent fixture with the actual limited-client SID. The first prototype placed cross-account token readback in the UI observer process with debug privilege, as required by [OpenProcessToken](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocesstoken). This is a fixture observation permission, not a product prerequisite or a claim about alternate-credential consent.

## 2026-11-06: separate native actor inspection from UI Automation

Diagnostic 42241665106 stopped at a native UI request deadline before an ordinary result. Keep the original incomplete evidence. Move actor inspection into the existing non-UI isolated launcher so UI Automation retains its previously working scope and privileges. The launcher reads the flushed original MSI log, queries the authenticated child PID while it is alive and retains actual SID/type/elevation/source/time. The independent gate binds that record to the actual observed wizard PID, initiating SID and authenticated source hash. Account observation is retained; no launch flag or inferred actor substitutes for native readback. Logging flush changes no installer properties or choices.

## 2026-11-06: UI Automation apartment requirement

Run 42244737428 reached the native fresh-install WelcomeDlg but the first observer query timed out before any ordinary upgrade. The original MSI log proves product UI readiness; this is an automation collection failure. [Microsoft UI Automation threading guidance](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-threading) recommends a non-UI MTA thread for desktop traversal and control patterns. Start the dedicated hidden observer with explicit MTA, attest its actual thread apartment in its existing source-bound handshake, and add bounded stderr phase diagnostics to distinguish assembly, desktop and control-query stalls. Keep the existing request/qualification limits and reject unsupported apartment execution. Verify this through the small published-pair diagnostic before another complete CI election.

## 2026-11-06: aggregate rerun evidence election

An unchanged Linux PCM retry produced a successful artifact created later than the original failure but with a lower provider ID. Aggregate name-pattern download selected/merged the old failure and failed its existing receipt assertion. Reuse the established latestQualificationArtifact creation-time contract and download explicit elected IDs. Keep every canonical and Windows worker packet, retain the election record and preserve both original outcomes. A newer failure must remain a failure; no pass-only fallback or removed qualification check is permitted. This changes CI input selection, not the reviewed installer authorization mechanism.
