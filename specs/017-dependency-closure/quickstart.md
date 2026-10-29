# S017 validation guide

1. Use Node 24, the repository Python environment, Rust 1.96 and declared platform SDKs. On Windows invoke console tooling through the verified hidden launcher; run no local native GUI acceptance.
2. Run `npm run check`, `npm test`, `npm run check:app`, `npm run check:docs`, `npm run build:site`, `npm run check:site` and `npm run test:site`. All must pass with the patched image dependency and exact imported recovery.
3. On the isolated Ubuntu baseline, prepare `cargo test --release --locked -p gallery-core --test glib_variant_iter --no-run`, then run the same command without `--no-run` during qualification. Require exact iterator values and boundaries from the actual patched dependency.
4. Run the ordinary hosted repository, product-windows, product-linux, product-macos, windows-packages, macos-packages and website scopes. Require actual native frames/input/PCM/accessibility, Full/Lite lifecycle and unchanged media plus exact source/artifact receipts.
5. Inspect failed-attempt diagnostics and final accepted receipts independently. Missing output, unrelated listeners, tampered vendor/brand files, stopped clocks or invalid PCM must reject acceptance. Verify final PR SHA, terminal checks and every review thread before owner merge.
6. After owner squash merge, verify main CI and GitHub advisory state separately; the PR cannot establish default-branch alert closure.
