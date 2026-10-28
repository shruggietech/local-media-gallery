# Research: macOS packages

Three read-only agents researched bundle/trust/root behavior, lifecycle ownership and native qualification before design.

## Native packaging

Decision: complete bundles before ad-hoc signing, native DMG Full and ditto ZIP Lite. Rationale: preserve bundle resource placement, executable modes and auxiliary assets. Alternatives: proof tarballs do not provide installation; custom ZIP extraction drops Unix modes; universal binaries expand scope.

Sources: [Apple bundle placement](https://developer.apple.com/documentation/bundleresources/placing-content-in-a-bundle), [Apple packaging and recipient testing](https://developer.apple.com/documentation/xcode/packaging-mac-software-for-distribution), [notarization workflow](https://developer.apple.com/documentation/security/customizing-the-notarization-workflow).

## Installation

Decision: native helper with embedded exact payload, physical destinations, exclusive command symlink, staged new install and selective removal. Rationale: reuse existing dependencies and separate application placement from retained Application Support. Alternatives: pkg scripts add receipt machinery without replacing ownership logic; recursive removal loses foreign files; profile edits exceed integration scope.

Source: [Apple filesystem domains](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html).

## Host/trust

Decision: actual arm64/minimum15 load commands, plist, compiled identity, WKWebView observation, signature integrity and separate quarantine/trust assessment. Build metadata cannot prove GUI or downloaded first-launch trust. No credentials assumed.

Sources: [minimum OS key](https://developer.apple.com/documentation/bundleresources/information-property-list/lsminimumsystemversion), [notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution).

## Root and native observation

Decision: explicit root precedence; known translocation asks for folder, ordinary removable/read-only galleries remain valid. Apple has no supported complete detection/original-path recovery API. No private product recovery API. External Swift AX and native screenshot verify ordinary apps, existing test-hook proof is distinct. Automation permission availability is preparation readiness, never a reason to weaken assertions.

Sources: [Apple DTS translocation](https://developer.apple.com/forums/thread/724969), [trusted AX clients](https://developer.apple.com/documentation/applicationservices/1460720-axisprocesstrusted), [LaunchServices completion](https://developer.apple.com/documentation/appkit/nsworkspace/openapplication%28at%3Aconfiguration%3Acompletionhandler%3A%29).
