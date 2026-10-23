# Deployment interfaces

## Maintainer commands

- `node scripts/configure-domain.mjs preflight`: read registration/zone/DNSSEC/DNS and Pages; private local snapshot, redacted summary.
- `node scripts/configure-domain.mjs plan`: derive exact owned-record changes from current provider state; zero remote writes.
- `node scripts/configure-domain.mjs apply`: revalidate plan and binding prerequisites, persist journal and reconcile elected web records only.
- `node scripts/configure-domain.mjs rollback JOURNAL`: reverse applied owned changes with exact compare-before-restore. Retain organization verification TXT.
- `node scripts/verify-deployment.mjs ARTIFACT EVIDENCE REVISION`: reject absent/failed qualification, identity mismatch or any inventory difference.
- `node scripts/verify-live-site.mjs ARTIFACT EVIDENCE`: bounded HTTPS/TLS/redirect and exact public file verification; terminal local acceptance JSON.

Provider credentials are environment-only. Public output excludes credentials, contacts and account-specific configuration identifiers. Local journals are ignored and must not be attached to public PRs.

## CI contract

Website qualification produces static inventory and deployment identity. The upload occurs after website checks; deployment additionally waits for repository and Windows product checks. No rebuild occurs with Pages credentials. Pages/OIDC write permissions exist only in the deploy job. Production concurrency is serialized without cancelling a running deployment. Default main and the exact owner-authorized bootstrap PR are the only elected publishing sources.
