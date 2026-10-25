# S011 Data Model

## Persisted loadingMode

Enum automatic/conservative/standard; missing legacy value resolves automatic. Known validated native field with generic sparse defaults/user/remembered/portable/session precedence. Only deliberate mode persists. Unknown compatible settings remain preserved by existing writers. No format or release version increment.

## Session policy

Identity: native sessionId and deliberate mode. Effective tier, reason and bounded samples live in memory. Page/filter/sort/focused transitions retire queues without importing old callbacks; session retirement resets policy. Manual policies do not adapt. Visibility/focus gaps clear timing baselines without treating inactivity as pressure.

## Queue job

Waiting -> active -> settled or cancelled. Start/completion/cleanup can be synchronous. Exactly one accounting transition and cleanup, including late-returned cleanup. Settled jobs retain source-cleanup ownership until cancellation. Dynamic lower limits drain active work; no replacement starts until eligible. Explicit completion outcome distinguishes decode failures from cancellation.

## Measurement record

Versioned maintainer report with label, timestamps, source/binary/flavor, fixture inventory, hardware/storage/runtime/cache qualifications, per-operation bounded raw timings and summaries, rAF gaps, active/pending/source/playback observations, process memory coverage, resource bounds/counters, separated footprint categories and limitations. No private collection text or absolute user paths in committed evidence.
