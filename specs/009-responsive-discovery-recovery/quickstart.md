# S009 validation guide

Use the repository's verified hidden launcher for console tooling on Windows. Prerequisite readiness is preparation, separately timed from qualification.

1. Run repository check/test, affected app checks and targeted native discovery regressions.
2. Build native-tests and ordinary artifacts through scripts/run.mjs or qualify.mjs; do not invoke visible console helpers.
3. Run full npm run qualify. The small rendered fixture must show progress/media before a held scan completes, Cancel from gallery/viewer, replacement/close rejection, retained partial observations, explicit unavailable recovery, page anchor continuity and unchanged source/state bytes.
4. Verify ordinary binary excludes discovery controls and still opens normally.
5. Read .local/qualification.json for terminal pass/fail, source identity and separate preparation/qualification/combined seconds. Do not infer physical device/network, scale, macOS/Linux runtime or installer acceptance.
6. Push the S009 branch, open a PR closing #10/#11, wait for terminal applicable CI and at most two review rounds, resolve every finding, and request owner final review/merge.
