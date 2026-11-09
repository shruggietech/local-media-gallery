# Legacy Windows MSI maintenance recovery

This source contract applies to the next candidate built with these changes. Published v0.2.2 and earlier assets remain unchanged and do not contain the new recovery patches.

## Observed failure

Exact published v0.1.0 and v0.2.0 machine installers can install successfully at a custom location and then refuse ordinary removal with error 1603. Their guard relies on an extended Windows Installer component-path lookup that can return UNKNOWN while the ordinary lookup, scoped component state, registered client, package identity and actual files agree.

On the isolated Windows runner, the elected 129-character executable path removed successfully and the 130- and 131-character paths failed. Flat and nested controls reproduced the same shorter/longer split. This is an observed boundary for that host and path family, not a universal Windows path limit. The separately tested v0.2.1 and v0.2.2 installers removed at the 131-character location despite the same extended-lookup discrepancy.

## Recovery mechanism

Full candidates contain payload-specific `maintenance/legacy-0.1.0-machine.msp` and `maintenance/legacy-0.2.0-machine.msp` Windows Installer patches. Each patch carries a guard compiled with its exact original payload manifest. The original published MSI, its package identity, application files, component definitions and integration definitions remain unchanged.

Before mutation, the replacement guard checks the selected native product, package, component, context and sole registered client, the physical destination, every extant owned payload byte, the manifest and scoped integration state. The ordinary component lookup supplies a path only as one corroborating observation. An UNKNOWN extended lookup alone never establishes ownership. Changed owned bytes, linked locations, mismatched identities and wrong patch targets refuse.

Patch construction compares every exported native table and stream. It permits only the new guard binary, the Preflight redirect and an early common Programs binding action. The original deferred verification action remains in place. File, Component, Directory, Feature, Registry and Environment tables cannot change. Native Windows Installer records and applies the patch.

## Owner workflow

Close running gallery processes before maintenance. Keep the matching original published MSI available for native source recovery if Windows Installer requests it. Choose the patch for the installed predecessor version; native target and ownership checks verify the choice.

1. Obtain the qualified Full candidate and administratively extract it into a dedicated folder. This extracts files without registering the candidate application:

   ```powershell
   msiexec.exe /a "C:\Downloads\Full.msi" /qn TARGETDIR="C:\LMG-Recovery"
   ```

2. From an administrator terminal, apply the matching machine patch. For v0.1.0:

   ```powershell
   msiexec.exe /p "C:\LMG-Recovery\Local Media Gallery\maintenance\legacy-0.1.0-machine.msp" REINSTALL=ALL REINSTALLMODE=omus /passive /norestart /L*v "C:\LMG-Recovery\legacy-repair.log"
   ```

3. After native patch completion, use ordinary Windows application removal or open the replacement Full installer. Retain the native log if repair refuses or reports an incomplete operation.

Managed update, rollback and recovery use the authenticated patch in retained Full payloads when the legacy extended lookup prevents maintenance. They keep the existing scoped native worker and terminal-outcome supervision. Recovery can reuse an already applied matching patch; it does not repeatedly reinstall that patch. A coordinating-client timeout or interruption does not establish that the native worker stopped.

Completed maintenance retains independent gallery media, sidecars, foreign files, preferences, history and shared WebView2.

## Verification boundaries

Qualification reproduces the original failure before repair, checks affected versions separately, exercises retained-input and changed-owned-file refusals, interrupts the actual coordinating client during a native patch, recovers to the current payload, restores the predecessor and subsequently removes it ordinarily. Private state, independent files, native registration, PATH, shortcut and runtime observations are retained with native logs and terminal receipts. Historical diagnostic artifacts do not qualify a changed candidate.

No installer or native GUI test runs on the active developer workstation. The existing qualification elections, advisory target, hard deadline and finalization reserve remain authoritative. Candidate verification and a merged source change do not announce a published release.
