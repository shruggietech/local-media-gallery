# Implementation Plan: macOS packages

**Branch**: `codex/016-macos-packaging` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

## Summary

Deliver #23 on macOS15 arm64 using ordinary release apps, ad-hoc signed completed bundles, a Full DMG with native lifecycle helper, and a Lite native ZIP. Test actual containers and native recipient behavior on isolated hosted macOS; retain existing platform gates.

## Technical Context

**Language/Version**: Rust1.96, Node24 maintainer tooling, Swift native observer.

**Primary Dependencies**: Existing Tauri/WKWebView/core, serde/serde_json/sha2/tempfile, Apple codesign/ditto/hdiutil/otool/ApplicationServices.

**Storage**: Embedded final Full payload manifest and an external installation receipt. Existing gallery/profile state unchanged.

**Testing**: Native lifecycle units, Node inventory/evidence negatives, actual release candidate native browsing, isolated user/system install/removal.

**Target Platform**: macOS15 arm64; Windows/Linux gates retained.

**Project Type**: Desktop application and native package helper.

**Performance Goals**: 660-second qualification target, 900 hard limit, preparation separate, 15-second provisional reserve.

**Constraints**: No owner workstation GUI or installation. No silent elevation, quarantine removal, shell-profile editing, release promotion or third review round.

**Scale/Scope**: Two editions, two install scopes, finite lifecycle operations and native fixture.

## Constitution Check

Pre-research and post-design PASS: owner scope #23 preserved; native core/state reused; exact inventories/source binding and truthful evidence; UTF8/LF; necessary CI changes recorded in changelog; push/PR authorized, owner merge retained.

## Project Structure

- crates/macos-package: native helper, lifecycle ownership units.
- scripts/macos-packages.mjs: manifest/evidence validation.
- scripts/build-macos-packages.mjs: ordinary release bundles, signatures, native containers.
- scripts/test-macos-packages.mjs: actual lifecycle/recipient campaign.
- scripts/macos-package-ui.swift: external AX/actions/window screenshots.
- scripts/ci-macos-packages.mjs: bounded qualification.
- specs/016-macos-packaging: design/tasks/final evidence.

## Decisions

1. Dedicated native Rust helper reuses dependency versions; no Windows MSI coupling or new app install provider.
2. User scope defaults to ~/Applications/Local Media Gallery Full.app and ~/.local/bin/local-media-gallery. System scope is explicit /Applications and /usr/local/bin, requiring prior root elevation. Do not modify shell profiles. Custom absolute destinations allowed.
3. Canonicalize existing ancestors (macOS /var aliases must work), reject redirected app descendants/command targets, stage on destination filesystem and rename only into absent target. Roll back new owned files if integration fails.
4. Embed final signed Full inventory in helper. Same-candidate repeat verifies exact bytes and integration. Different/changed candidates reject replacement; #25 owns migration campaigns. Removal deletes unchanged owned files only, retains extras/changed bytes and external state.
5. Native ditto ZIP for Lite and hdiutil DMG for Full preserve bundle/mode/asset integrity. Inspect actual Mach-O deployment/architecture, plist and runtime capabilities.
6. Candidates ad-hoc signed, unnotarized. Record actual trust/quarantine separately; no Developer ID credentials or release inferred.
7. External Swift AX observer/actions and native capture verify ordinary release apps; private-hook runtime tests remain separate. Required automation availability is a preparation prerequisite, with concrete failures.
8. Recognized AppTranslocation placement asks for a real root. Do not reject all /Volumes paths or claim complete original-path recovery. Full mounted launch already selects a folder.

## Workflow

Installed /speckit-specify, clarify, checklist, plan, tasks, analyze, implement sequence. No extensions.yml hooks. Custom requirements checklist remains reviewer-owned; current explicit autopilot authorization permits proceeding while open. Three read-only research agents were required by speckit-plan. Local checks then authorized commit/push/PR, maximum two requested review rounds, resolve verified findings promptly and stop for owner merge.
