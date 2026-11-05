# S030 qualification guide

1. Run hidden repository checks (npm run check, npm test, npm run check:docs), affected site checks and Rust installer/update unit tests using verified local launchers. Do not run any local installer or GUI driver.
2. Build the actual unsigned dual MSI on isolated Windows CI with the pinned offline runtime and inspect its properties, Binary streams, feature choices and embedded cabinet.
3. Copy only the MSI into the isolated campaign directory. Exercise native wizard license refusal/acceptance, scope/location selection, Back/Cancel and independent integrations. Retain screenshots and terminal readback.
4. Exercise quiet properties, runtime absent/present offline cases, repeat/repair/replace/remove, foreign conflicts, failure/cancel/recovery and published predecessor compatibility using the existing engineering campaign. Retain timings and incomplete observations.
5. Validate current versioned release records/schema/docs and unchanged published snapshots. Read final-commit applicable CI and all review threads, request at most one additional review round, then hand the unmerged PR to the owner.
