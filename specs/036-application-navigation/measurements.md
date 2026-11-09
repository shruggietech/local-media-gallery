# Measurements: S036

## 2026-11-08: local development checks

These are development checks, separate from hosted native and package qualification. No installed application, installer or native input was launched on the workstation.

- The repository Node suite completed 347 tests, with 345 passed and two existing platform-specific skips, in 9.73 seconds.
- The rendered synthetic-host Chromium suite passed eight behavior groups, including 15 task pages, Unicode clipboard and selection, scope writes, viewer node/playback continuity, persistent information display, retained thumbnail draft and guided polling/cancellation.
- Responsive observations include 320px width, actual browser coarse-pointer emulation, 200 percent body text and light/dark axe scans. These establish browser behavior, not physical touch input or native screen-reader operation.
- TypeScript, ESLint, governed style checks, native compilation/clippy and application unit checks passed locally. Affected website checks are recorded in verification.md once terminal.

Hosted qualification retains the 660-second advisory target, 900-second hard limit, fifteen-second finalization reserve and separate preparation/qualification/combined clocks. Final exact-head native and ordinary package results belong to the PR receipt.
