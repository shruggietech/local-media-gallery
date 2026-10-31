# S019 data model

## Readiness observation

formatVersion1; native target string; unchanged lock SHA-256 (64lowercasehex); unique package identities with name/version/source; nonempty graph digest; cache basis ordinary or fresh-owned; started/terminal timestamps and actual elapsed seconds. Offline metadata must succeed before preparation is ready. A failed command cannot emit a successful observation.

## Cold witness

Fresh owned Cargo home and empty target directory; no pre-existing entries or compiler output. States: empty/offline-failed -> fetched/offline-complete/notices-complete -> owned-tempfile-missing/offline-failed -> repaired/offline-complete/notices-equal. Deletion paths must resolve within this created home and identify exactly tempfile3.27.0's source/archive. Preserve lock bytes and source identity.

## Native payload authority

Existing macOS formatVersion1/version0.0.0/edition full|lite/arch aarch64/release payload and64hex hashes/decimal byte strings/modes644|755 remain. Binary and Info.plist are required. CodeResources is not required, but any listed file remains owned and verified; no signature-specific ignored paths. Source/revision/native target bindings and collision/removal/retained-data checks stay unchanged.

## Policy observation

Project signing/notarization: not performed by policy. Compiler/native load-command observations and terminal host assessment are separate optional facts, not publisher identity or credential gates. Historical receipts remain unchanged.

## Dependency/cache input

Every root/workspace dependency specification matches its package-lock package entry. Current elected updates parser8.72.1 and Lucide1.62.0. Cache suffix is64hex qualified-source identity, independent of Git revision when source bytes are equal; compiler checks and qualification always run.
