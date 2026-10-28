# Windows Candidate Package Contract

The versioned implementation schema will be schemas/v0.0.0/windows-packages.schema.json. Source and candidate schema versions remain0.0.0; no canonical published-release record is produced.

## Distribution

Full ZIP contains two scope-specific MSI packages, user-default and explicit-machine prerequisite entrypoints, pinned Microsoft input, source/package identity and notices. Lite ZIP contains the ordinary release executable at gallery root, notices, identity and prerequisite guidance. Normal recipient browsing requires neither developer tools nor a selected external browser. Optional FFmpeg stays independently selected.

## Entry points and standard engine

Default user setup installs for the current user. The separate machine entrypoint is an explicit administrator operation. Quiet/machine-readable operation is available for isolated qualification and disables interactive prompts. Interactive installation uses native installer facilities and explains scope/destination/prerequisites before mutation.

Packaged inputs must match compiled identity/hashes before use. Preflight inspects actual ownership/destination/integration before shared-runtime or application changes. Windows Installer owns copying, registration, rollback and selective removal. Direct MSI repeats preflight and checks an existing runtime; if it is unavailable, guidance identifies the matching prerequisite entrypoint.

Immediate native guards are read-only. Deferred native read-back runs after actual file/integration operations and before final commit. Unknown uninstall strings are never executed. Unsupported version/package replacement is rejected before destructive action. A started child/download/installer is never sufficient evidence of success.

## Retention and integration

Only registered application files and owned registration/shortcut/PATH segments are removable. Use named file/component rows and empty-directory removal, never recursive unknown-content removal. Media, sidecars, portable galleries, retained user state and shared runtime are not owned removal targets. Actual foreign integration changes must remain unchanged or stop removal with a useful collision result.

Terminal command proof uses actual registry-derived fresh PATH; test-only install-directory injection is forbidden. Directory/file/command/shortcut/registration collisions and wrong identities are separate negative outcomes.

## Evidence

Candidate package and installed/extracted/runtime/optional footprints are separate. Native ordinary-binary root/decoded-pixel/Refresh observations complement byte audits; windows, image-role names and successful capture calls alone do not prove rendering. Real process-local native-runtime lookup failure is explicitly labelled controlled, not clean-machine absence. All mutations/GUI/input occur only on isolated hosted Windows.
