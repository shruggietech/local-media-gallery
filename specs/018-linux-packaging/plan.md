# Implementation Plan: Linux Full/Lite packaging

**Branch**: `codex/s018-linux-packaging` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: S018 and issue #24.

## Summary

Assemble ordinary release Full .deb and Lite tar.gz candidates for the approved Ubuntu24.04 x86_64 host. Use dpkg transactions with exact embedded POSIX ownership guards, a pre-ELF runtime launcher and external isolated native recipient qualification. Preserve the shared gallery and all existing product gates.

## Technical Context

**Language/Version**: Node24, Rust1.96 existing native app, Python3.12 maintainer observer, POSIX /bin/sh recipient entrypoints.

**Primary Dependencies**: Existing Tauri/GTK3/WebKitGTK4.1/libsoup3, Debian dpkg/APT/Essential tools, derived shared dependencies and elected GStreamer plugins. No new product runtime framework.

**Storage**: Package-manager-owned system application/integration; existing external gallery/user settings and history; ignored exact qualification artifacts.

**Testing**: Node adversarial identity/evidence regressions; ShellCheck on actual generated scripts; real dpkg/APT lifecycle; ordinary release AT-SPI/X11/PulseAudio campaign; complete existing repository/app/site/platform/package matrix.

**Target Platform**: Ubuntu24.04 x86_64, glibc2.39 baseline, isolated X11/Xvfb; other distribution/architecture/Wayland combinations remain separate.

**Project Type**: Native desktop application with platform package tooling.

**Performance Goals**:660s qualification target,900s hard maximum,15s reserve; all provisioning/builds before readiness. Finite bounded native probes and observations.

**Constraints**: No local GUI/input; no unattended elevation; no recursive installer removal, dependency autoremove, source/brand corruption, review-cap bypass or product release.

**Scale/Scope**: One large packaging issue, two edition candidates, small synthetic galleries, existing ordinary core plus one Linux package scope.

## Constitution Check

| Principle | Before research | After design |
| --- | --- | --- |
| Owner-directed scope | Pass: approved #24/elected host | Pass: established package policy, no new product restriction |
| Proportional implementation | Pass: existing core/contracts | Pass: dpkg owns transactions; no new installer framework |
| Data/delivery integrity | Pass: exact source/brand authority | Pass: inventory/mode/parent/link checks and exact governed assets |
| Truthful verification | Pass: isolated native evidence required | Pass: ordinary-candidate observations distinct from private-hook core campaign |
| Publication boundary | Pass: explicit push/PR authorization | Pass: candidate CI only, owner merge and later product release |

## Project Structure

- scripts/linux-packages.mjs: strict package identity, payload/native evidence and footprint validation.
- scripts/check-linux-package-scripts.mjs: fail-fast ShellCheck of generated protocol/launcher bodies before native build admission.
- scripts/linux-package-scripts.mjs: generated POSIX preflight and Debian lifecycle guards, exact file authority and documented dpkg handlers.
- scripts/build-linux-packages.mjs: release builds, existing notice assembly, dpkg-shlibdeps/control scripts, exact assets and .deb/tar.gz/inventories.
- scripts/proof-archive.py: reject raw TAR mode/special-bit drift before extraction normalization, with a real malicious-member regression.
- scripts/linux-deb-audit.py: pre-extraction ar/tar structure, type, path, hash and mode verification.
- scripts/linux-package-ui.py and linux-package-pixels.py: bounded external AT-SPI/native screen observations and pixel readback, no app hooks.
- scripts/test-linux-packages.mjs and ci-linux-packages.mjs: actual apt/dpkg conflicts/repeat/removal, ordinary native Full/Lite roots/settings/Refresh/video/PCM and independent receipts.
- schemas/v0.0.0/linux-packages.schema.json; tests/linux-packages.test.mjs and tests/linux-package-scripts.test.mjs: contract/adversarial regressions before implementation.
- .github/workflows/ci.yml, scripts/ci.mjs, scripts/check.mjs, scripts/provenance.mjs: mandatory isolated package scope, authored shell integrity and established evidence exclusions. Update applicable source-required check policy only after actual new scope passes.
- apps/gallery/src-tauri/src/launch.rs: correct empty DISPLAY/WAYLAND_DISPLAY handling; finite CLI stays headless.
- docs/v0.0.0/installation-and-distribution.md, verification-and-compatibility.md, interfaces-and-contracts.md, schemas/v0.0.0/platform-matrix.json, site/versions.json, CONTRIBUTING.md, CHANGELOG.md: authoritative candidate/prerequisite/operation/identity/trust limits.

**Structure Decision**: Reuse shared proof/notices, provenance, qualification and native PCM helpers. Keep Linux-specific lifecycle and package receipts separate from other platforms and instrumented media evidence.

## Decisions and implementation gates

See [research](research.md), [data model](data-model.md), [operation contract](contracts/linux-packages.md) and [validation guide](quickstart.md). All alternatives resolved. Tests precede implementation. Mandatory actual lifecycle guards include dpkg fallback/unwind behavior, same-version config-files reinstall, changed files/modes, symlinks/parents, and registered ownership. Actual candidate install uses APT declared dependencies on the already prepared isolated host; clean-machine provisioning is not claimed.

Recipient native evidence is independent of instrumented core results: exact release ELF/hash/root, AT-SPI controls/settings, actual image/video snapshots and owned tone/silent PCM. Existing product-linux clock/seek/assertions remain mandatory and unchanged. No blanket new frame-hash allowance in runtime-evidence.mjs.

Generated shell uses Essential POSIX semantics because dpkg cannot run a newly unpacked helper in preinst. ShellCheck and actual protocol tests are mandatory. Source digests exclude only the same three S018 progress/evidence records as prior slices; final GitHub head and exact source/artifact identities still gate handoff.

## Phases

1. Complete Spec Kit design/requirements review and blocking analysis.
2. Regress strict payload/evidence/ownership/preflight contracts, then implement Full builder and dpkg guards.
3. Implement Lite external-root package and dependency diagnostics; qualify actual shell output.
4. Implement ordinary native recipient observer/campaign and isolated package scope, retaining all prior gates.
5. Update authoritative docs/schema/matrix, run local headless parity and hosted native matrix, publish PR, handle capped review and hand off.

## Complexity Tracking

No constitution exception. New shell scripts implement the existing system package-manager interface; external Python/UI/PCM tools are maintainer-only.
