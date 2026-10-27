# S013 Preparation and Diagnostic Contract

## CLI

- prepare [DIRECTORY] [--cache local|portable] [--ffmpeg ABSOLUTE --ffmpeg-sha256 HEX] [--json] previews only, with no writes.
- prepare [DIRECTORY] --thumbnails [--cache local|portable] [--ffmpeg ABSOLUTE --ffmpeg-sha256 HEX] [--diagnostics] [--json] explicitly commits generation after the same native preview.
- prepare [DIRECTORY] --clean-cache [--cache local|portable] [--diagnostics] [--json] explicitly cleans validated owned cache entries, preserving unrecognized/corrupt/future files and source/state.
- diagnostics [--json] describes only this invocation's context/diagnostics, never another process's memory.

Preserve args_os, -- terminators, explicit-root precedence and Full/Lite defaults. Finite preparation requires a resolved root; Full chooser is not silently invented for a headless command. Reject conflicting flags, relative helper paths, missing/invalid helper hashes and inappropriate flags before state writes. A bare preview does not generate. Exactly one OperationResult JSON on stdout; human progress stays stderr. Existing exit0/1/2/3/4/5 meanings apply; startup exit6 remains specific to S012 detach. A helper timeout is a distinct preparation error and unknown lifetime is explicit. Requested --diagnostics appends a redacted report inside data of that one result. Native Ctrl-C/termination requests the same cancellation token and preserves completed output; confirmed child exit precedes stopped claims.

## Main-window native boundary

preparation_preview(sessionId,destinationKind), preparation_start(sessionId,previewId), preparation_cancel(sessionId,jobId), preparation_status(sessionId,jobId), preparation_cleanup(sessionId,previewId), select_thumbnail_helper(), diagnostics_snapshot(), diagnostics_export(), report_media_observation(sessionId,itemId,itemRevision,observationEnum) and cache lookup/cancellation use main-window authorization, exact native captured authority and bounded admission. Native picker owns export/helper paths. Renderer provides no arbitrary cache/output/source pathname. UI selection computes/displays exact helper identity before activation; changing bytes invalidates the preview.

Subscribe before requesting initial status. preparation-changed events target the main window, carry job/session/increasing sequence, and cannot advance gallery snapshot state. Closed/replaced sessions and older sequences are rejected. Cancellation remains available during focused viewing; healthy original playback is unaffected by preparation. Diagnostics events use allowlisted data and no raw paths.

## Cache cards

Optional visible-demand validation uses at most two native permits and bounded client admission. Original paths remain available while validation runs; hidden/retired interest cancels pending work and ignores stale completion. Only opaque current session/item/revision/cache-grant identifiers reach the private media route; cache record paths are never followed. Validate actual PNG bytes/dimensions/hash and full source fingerprint before granting derived bytes. Decode failure falls back once to the original without modifying original MediaFacts. Viewer and metadata always retain the original route.

## Storage and recovery

Preview binds the held root/destination, source digests, provider policy and exact selected slots, with explicit upper-bound storage. Start rechecks those facts; conflicts require another preview. Generation stages/validates first, then no-clobber publishes a complete entry under the current root commit gate. Hard-link publication is preferred; create_new complete-envelope fallback supports filesystems without links and is documented as recoverable, not universally atomic. Unfinished records are misses and are not overwritten. Concurrent writers use operation-owned locks. Cleanup performs bounded no-follow per-file checks and removes only validated owned outputs; no recursive deletion/reset. Invalid/future convenience state is preserved with actionable recovery, not silently rewritten.

## Admission and preview lifetime

The host owns one PreparationService per process, sharing the Engine. preview returns an admitted job identity immediately; its worker hashes sources and inspects destinations asynchronously, publishing bounded progress. status returns the latest state and, only when ready, the immutable preview. start consumes that ready preview and reuses the same admission; cleanup uses the same admission. cancel works during preview, generation and cleanup. A second request while work is active returns busy. Root replacement cancels the active operation. Cache validation has a separate two-permit admission and never delays the original media request. Native cancellation is checked between read chunks and before publication. CLI drives this same service to a terminal result.
