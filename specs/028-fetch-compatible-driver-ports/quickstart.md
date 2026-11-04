# S028 validation guide

1. Use the pinned Node 24.11.0 runtime and existing installed dependencies. On Windows, invoke non-Git tools through the verified hidden launcher.
2. Run `node --test tests/native-driver-lifecycle.test.mjs`. Expect deterministic restricted-then-allowed selection, finite exhaustion, error/cleanup cases and the existing actual HTTP ownership/deadline cases to pass.
3. Run `npm run check`, `npm test` and `npm run check:docs`. Retain terminal exits and logs.
4. Push the slice branch and open the official PR with `Closes #87`. Wait for all applicable CI jobs, including native Windows/Linux/macOS and release validation.
5. Resolve every review finding within two total rounds and hand the unmerged PR to the owner.

No local GUI/input or system port-range adjustment is required. No release assets are rebuilt for publication or republished.
