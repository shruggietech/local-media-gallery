# S011 Research (2026-10-25)

## Measurement and provenance

Decision: one external native driver harness measures preserved unchanged and final binaries with identical small fixtures and settings. Baseline binary SHA256 1316bdda17deb24f1208231d124eacee3459defdbebd2362a68dc2ac19ec72e0 matches the passed native receipt, source da459c15f126e1156529c1b012818c9105522b269cb85afa5ebfdbba9983b78e, merged revision a0b85881fdf6b9db080d67d70bd7b25bb4a5839a. Debug/native-test flavor is explicit.

Rationale: rebuilding first would lose the actual unchanged baseline. New driver measurements require no baseline app instrumentation. First profile/process and repeated same-session runs are distinct; fixture generation/hashing influences OS cache, so OS-cold is unqualified. Alternatives rejected: synthetic unit timings as native evidence, treating elapsed driver calls as pure renderer cost, purging machine caches.

Use bounded raw operation/frame observations, monotonic clocks and separately named end-to-end versus in-WebView durations. rAF gaps are callback responsiveness, not compositor FPS. Capture native-root and descendant WebView process private bytes/working set through one persistent hidden PowerShell observer, including process creation identity, incomplete coverage and endpoint/sample semantics. No command lines or private paths in committed evidence. Footprints distinguish development executable, shared installed runtime, fixture tools, profile/cache, absent thumbnail tools/cache and unpublished download/extracted distribution.

Primary sources: [WebView2 process model](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model), [Win32_Process identity](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process), [private bytes](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.privatememorysize64), [working set](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.workingset64).

## Adaptive policy and resource ownership

Decision: retain one gallery preparation queue, add a pure finite controller and dynamic limit/priority updates. Auto tiers 1/2/4 and 0/10/25 percent near-viewport interest are candidate ranges, with thresholds settled only after unchanged native measurements. Manual Conservative and Standard select fixed policies. No forced page changes.

Rationale: this extends existing bounds. Held work must create pressure without completion. Hysteresis, bounded duration/frame/failure observations and gradual recovery avoid oscillation; idle windows cannot promote. Alternatives rejected: device-memory-only policy, replacing queues on every sample, synthetic hard performance promises.

Fix accounting with finally on throwing cleanup, deferred cleanup returned after synchronous retirement, thrown-start failure admission and explicit decode rejection. Retain settled-job cleanup ownership for mounted sources. Browser internal decode cancellation is not certified by removing a source.

Policy/calibration lives above MediaGrid, scoped to root session and deliberate mode. Queue lifetimes are shorter (page/filter/sort/focus); obsolete queue callbacks cannot update policy. Focus removes the grid, preserves playback key/effect and suspends sampling. Hidden documents retire gallery sources and resume timing baselines. Separate existing finite resource classes: discovery one plus one replaceable pending, metadata one, transport32, gallery preparation at most4, retained card sources bounded by current interest/page96, focused one media element. These are different resources, not one global CPU semaphore. Measurement counters must name their actual ownership or explicitly identify proxy/unavailable metrics.

Primary sources: [monotonic time](https://www.w3.org/TR/hr-time-3/#monotonic-clock), [page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility), [rendering updates](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering), [Intersection Observer](https://w3c.github.io/IntersectionObserver/).

## Preference and UI integration

Decision: loadingMode enum automatic/conservative/standard, default automatic, one additional existing native setting. Reuse all four destinations and generic precedence. Legacy omission remains valid; invalid values fail without replacing bytes. Transient measurements never persist.

Rationale: one field integrates native FIELDS/default/enum, exhaustive precedence alternatives, TS types/defaults/labels and owned schema settings/choices/patch/envelope provenance. Alternatives rejected: separate file, persisting effective tier or machine samples, loading mode in grid/viewer React keys. Governed Field/Select provides all needed semantics without kit modifications.

## Research completion

All three plan-required read-only research agents completed. No implementation delegation. No unresolved technical unknown blocks design. Initial numerical thresholds remain an intentional measured checkpoint, not an unresolved product decision.

## Settled baseline tuning checkpoint (2026-10-25)

See [measurements](measurements.md): unchanged native observations precede policy code. Auto starts4 with tiers4/2/1 and prefetch25/10/0percent; manual conservative2/standard4. Evaluation250ms, four-completion minimum, slow500ms, held1000ms, frame p95 over50ms with8samples, two pressure windows down and four healthy busy windows up, bounded32completion/120frame samples, hidden/over1000ms frame baselines reset. These are proposed tuning values, not release-scale performance guarantees.

## Initial proposed tuning

Automatic starts at the existing four-preparation ceiling and can reduce to two, then one. Conservative fixes two; Standard fixes four. Corresponding prefetch margins25/10/0 percent are work-interest bounds, not page-size changes. A250ms evaluation window with at least four completed samples uses slow work over500ms or repeated failures as pressure; a visible active job older than1000ms can signal pressure before completion. Two consecutive pressure windows reduce one tier; four healthy busy windows recover one tier. Frame-gap pressure uses p95 over50ms with at least eight visible frame samples per window. Hidden intervals and gaps over1000ms reset frame baselines. Samples are finite32 completions and120 frame gaps.

Rationale: baseline callbacks were8.5ms at p95, and all measured sorting/filtering/metadata elapsed medians were below166ms; the proposed50ms frame and500ms work boundaries leave conservative headroom. Driver operation timings do not directly equal decode duration, so these are initial engineering proposals validated with deterministic pressure/recovery tests, not inferred codec/scale guarantees. Held-work pressure prevents an incomplete slow task from being invisible. Hysteresis avoids changing policy for isolated samples. Thresholds may be revised with actual field evidence without silently changing deliberate page settings.

