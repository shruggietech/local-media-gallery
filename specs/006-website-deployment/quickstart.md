# Validation guide

1. Install the documented maintainer prerequisites and dependencies. Keep existing Cloudflare DNS/registrar tokens in the environment; authenticate GitHub CLI with existing administration access.
2. Run `node scripts/configure-domain.mjs preflight` and `plan`. Check exact owned registration/delegation, Pages binding, organization TXT, DNSSEC/CAA and proposed web records; do not publish local snapshots.
3. Run `npm run check`, `npm test` and the affected site/product qualification. Artifact validation must reject a deliberately altered fixture and accept the exact successful output.
4. Apply the authorized provider plan after organization verification and repository custom-domain assignment. Read back both authoritative nameservers and independent public resolvers.
5. Push/open the official PR. Wait for all qualification jobs and the serialized Pages deployment, then download the exact deployed static artifact and evidence.
6. Run `node scripts/verify-live-site.mjs ARTIFACT EVIDENCE`, verify rendered search/navigation/diagrams and confirm enforced HTTPS without mixed content.
7. Repeat reconciliation for zero changes and exercise conflict-aware rollback on an explicitly scoped temporary DNS record. Keep the ownership TXT and checked content recoverable.
8. Respond to all actual reviews within at most two rounds. Hand off the green final PR for owner review and merge; remove temporary bootstrap deployment permission after merge.
