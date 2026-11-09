# S038 repair research

2026-11-09: Two read-only planning researchers inspected the observer and campaign boundaries.

- Decision: retain MTA and same-source initialization route. Rationale: current production launcher and tests explicitly require MTA; request API already clips timeouts to absolute deadline and retires failed sessions. Alternative separate helper extraction adds source dependency validation without benefit.
- Decision: elect lifecycle for all three ordinary upgrades. Rationale: experience completed 0.2.1 at 21:57:25Z with only 19 seconds to active deadline in attempt 2; moving only 0.2.2 leaves inadequate reconciliation time. Lifecycle passed both attempts and has a clean no-Full-installed point after prepared recipient. Alternatives extra workers, omitted coverage or enlarged hard deadline are unnecessary.
- Decision: explicit optional packet markers. Rationale: new evidence must enforce ownership and initialization while immutable historical records preserve original semantics. Final byte validator and native label uniqueness remain unchanged.

No unresolved research questions. Failed main run 42694671875 attempts 1 and 2 are preserved under issue #118; no further unchanged rerun.
