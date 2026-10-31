# S019 research and decisions

## Complete pinned readiness

Decision: shared no-target cargo fetch --locked followed by the existing native-target offline metadata before builds. Rationale: main41154123337 compiled release binaries but offline metadata lacked tempfile3.27.0 from the workspace/notice graph. That package is used both by tests and normally by the macOS helper. Alternatives rejected: dropping --offline/--locked, omitting notices, relying on warmed test compilation, and assuming target-only fetch covers all workspace metadata. [Cargo fetch](https://doc.rust-lang.org/cargo/commands/cargo-fetch.html), [Cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html). Actual pinned Cargo1.96 Windows query returned328packages/328resolve nodes and no GLib; keep existing notice selection rather than infer a scope expansion from newer documentation.

Decision: extract the production Rust notice collector for the actual fresh/partial Cargo-home witness. Use existing workspace inputs and no compiler output; then run normal actual packages. Alternatives rejected: fake metadata as sole evidence, duplicate notice regexes, recompiling every platform twice, or deleting unrelated caches. Confine targeted source/archive deletion to the newly owned fresh home and retain failures/lock identity.

## No project signing work

Decision: remove project codesign calls and required CodeResources from both JS and Rust helpers; preserve ordinary compiler/linker output, inventory integrity and actual native use. [Apple ld64 defaults](https://github.com/apple-oss-distributions/ld64/blob/f60a74eaa2c99585de1dc0f2820e7a9f8aaf522c/src/ld/Options.cpp#L6196) and [LLVM defaults](https://github.com/llvm/llvm-project/blob/7a0edec33d6ae6a00f3b1c276efa4bf152210235/lld/MachO/Driver.cpp#L1217) emit arm64 macOS loader metadata. [XNU enforcement path](https://github.com/apple-oss-distributions/xnu/blob/f6217f891ac0bb64f3d375211650a4c1ff8ca1ea/bsd/kern/mach_loader.c#L1744) can reject absent signatures under enabled enforcement. This does not establish every host's policy. Alternatives rejected: identity/notarization services, stripping mandatory loader metadata, silently dropping macOS, or treating signatures as complete file authority. Native hosted proof remains mandatory.

## Compatible inputs and cache bounds

Decision: consolidate parser8.72.1/Lucide1.62.0 from #68 and regenerate/normalize the lockfile. Its workspace declaration uses ^1.62.0 while the app manifest pins1.62.0, so add a real declaration-consistency regression. No governed brand bytes change.

Decision: preserve existing cache paths/scope/OS/image/lock/toolchain keys and fallbacks, replacing only the per-commit suffix with sourceIdentity. [GitHub cache reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching) explains immutable scoped caches; main cannot rely on PR-only caches. Source-identical record commits should not create duplicate multi-GB snapshots. No quota expansion, receipt reuse or check skipping.

Three mandatory planning research agents completed these domains. The independent requirements reviewer approved10/10 packaging checklist criteria; these marks indicate requirements quality only. All implementation unknowns are resolved.
