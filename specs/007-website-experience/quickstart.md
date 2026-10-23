# S007 validation procedure

1. Use Node24 and the existing hidden Windows launcher. Install the locked workspace dependencies with npm ci and prepare the pinned Playwright Chromium/fonts.
2. Run npm test for canonical rendering, source confinement, retained versions, metadata, SVG invariants and release fail-closed contracts. Run npm run check for file, brand and version integrity.
3. Build the site using npm run build:site. This stages governed assets and renders diagrams before Next static export. Run npm run check:site and npm run test:site against the exact output.
4. Inspect the home and a long documentation page in light/dark at390/768/1440. Verify native anchors, pinned active TOC, mobile navigation, copy success/failure, Mermaid source and local overflow, version search, 320 reflow and200 percent text. Review saved visual, axe and cold lab evidence against plan.md budgets.
5. Run the existing full Windows qualification through its hidden launcher. Preserve terminal timing/source identity and native fixture results. Commit, push and open the official S007 PR; let CI deploy the exact checked artifact under the scoped Pages bootstrap.
6. Address every external review comment with at most two review rounds, confirm terminal exact-head CI and live identity, then ask the owner for final review and merge. Do not merge autonomously.
