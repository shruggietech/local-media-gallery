# Validation guide

1. Use the repository's hidden launcher on Windows with Node 24 and prepared Python/browser prerequisites.
2. Run `npm run check`, `npm test` and the affected release campaign (`node scripts/test-release-campaign.mjs`).
3. Confirm delayed committed mutations require one write each, temporary draft URLs pass staging, and changed final URLs/foreign assets fail.
4. Extract retained execution artifacts into a fresh directory and invoke the gate evidence verifier on candidate and publication directories. Both must pass without rebuilding.
5. Modify or remove an exported file and confirm readback fails.
6. Push the branch/open the authorized PR, wait for final-head CI and at most two review rounds, resolve findings and stop for owner merge.

Controlled-service checks are pipeline verification. They do not publish a real product or replace native CI qualification.
