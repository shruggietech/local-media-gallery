# Internal evidence changes

New build packets carry ordinaryUpgradeWorker (experience or lifecycle) and msiObserverInitialization (explicit-v1). Absence alone preserves historical readers. Both are included in the existing full build SHA-256.

Each new worker fragment observer identity retains PID, creation identity, MTA, source hashes and server/executable identity. observer.msiInitialization carries ready=true, pid matching identity, apartment=MTA and sourceSha256 matching observer.sources.msi and observer.sources[msi-initialize].

Elected worker owns ordinaryUpgrade and ordinaryUpgrades; alias equals row zero and ordered predecessor versions exactly match build.ordinaryPredecessors. Non-owner omits both fields. Reconciliation remains non-accepting until the full native/byte/source gate succeeds.

The optional build.windowsUpdateEvidenceTransport marker elects sha256-blobs-v1. The lifecycle reference fixes manifest path, format, decimal byte count and SHA-256. The source/revision-bound manifest lists exact ordered transition roots, every regular file path/size/SHA-256 and all directory paths. Blob filenames are derived solely from content SHA-256. Windows-native metadata paths normalize only for transport lookup; original transaction JSON bytes remain unchanged. Manifest <=32 MiB, each file <=512 MiB, total logical expansion <=8 GiB, unique blobs <=2 GiB and total entries <=20000. Rehydration validates all blobs before copying independent regular files, permits identical existing files, rejects extras/redirected parents/aliases, and remains repeatable before release preflight and package validation. Historical packets without marker use raw snapshots.
