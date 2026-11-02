# S025 packaging research

2026-11-02. Three Spec Kit research agents inspected current native builders and primary platform sources. No native behavior is claimed by this design research.

## Lite

Decision: publish each normal release-profile native executable directly, embedding notices and maintenance metadata. Tauri already embeds frontend; SQLite is linked. Existing launch.rs derives a bare executable's parent gallery on all platforms. Remove recipient archive/wrapper/application-bundle assumptions in new records while retaining v0.1.0 decoding.

Alternatives: archive renaming fails #80; self-extraction is unnecessary unless a demonstrated native constraint requires it. Bare Mach-O GUI launch and relocation are an early native proof, not inferred from CLI identity. Apple supports embedded __TEXT,__info_plist metadata: https://developer.apple.com/documentation/xcode/build-settings-reference .

## Windows Full

Decision: one elevated setup EXE with embedded machine MSI, complete offline Evergreen Standalone runtime, updater metadata and bundled feature helper. Extract to a fresh private machine-owned directory, verify and hold payload identities before execution. Existing ownership/MSI checks remain authority. Replace loose old/new descriptor inputs with installer-driven discovery and managed retention.

Microsoft permits embedding its offline runtime and documents /silent /install with elevated per-machine deployment: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution . Online bootstrapper and per-user default are rejected by #80.

## macOS Full

Decision: native flat system-only pkg contains app, FFmpeg, notices and lifecycle helper. Installer authorization handles privileges. Embedded script invokes existing ownership-aware installation rather than copying over foreign app contents. Retain internal maintenance data; ordinary user does not select descriptors. WKWebView is OS-provided.

Apple distribution domains: https://developer.apple.com/library/archive/documentation/DeveloperTools/Reference/DistributionDefinitionRef/Chapters/Distribution_XML_Ref.html . Native pkgbuild capabilities and direct Mach-O GUI launch require native proof.

## Linux Full

Decision: one native executable installer contains app.deb and exact Ubuntu runtime dependency deb closure, including feature helper. Offline apt uses only embedded local packages, prohibits downloads/unrelated removals/downgrades and retains package-managed shared dependencies after application removal. Construct closure against a clean Ubuntu 24.04 baseline, not prepared runner state.

Alternatives: a plain deb retains online dependency resolution; private WebKit copying is unreliable because subprocess relocation overrides are developer-build-only in upstream source. https://chromium.googlesource.com/external/github.com/WebKit/webkit/+/8e6f0e6498f75eabe2fd9d46e87d7469ecad25f0%5E%21/ . Offline apt: https://manpages.ubuntu.com/manpages/noble/man8/apt-get.8.html . Privilege handling: https://manpages.ubuntu.com/manpages/noble/man1/pkexec.1.html .

## Feature dependency delivery

Decision: source/build a pinned LGPL-only FFmpeg CLI configuration with corresponding source/build recipe and notices, bundle it in Full and select its verified installed path automatically. Do not repurpose the current maintainer-only GPL helper without complete redistribution provenance. Source/configuration rules: https://ffmpeg.org/legal.html . Preserve explicit user override.

## Qualification and execution

Decision: preserve existing functional/integrity/provenance/elected checks, add literal single-file and clean offline tests, use isolated hosted desktops only. Preparation includes tool/runtime downloads and builds; qualification retains660s advisory target,900s hard ceiling and 15s reserve. Final receipts belong in PR handoff to avoid record-only commits retriggering the matrix. Native feasibility failures must not be renamed passing packaging evidence.

No signing, notarization, release publication or attended gate is added.
