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
