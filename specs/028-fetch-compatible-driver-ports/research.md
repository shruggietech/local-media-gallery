# S028 research

## Restricted HTTP ports

Decision: copy the 82 numeric restricted ports from pinned Node 24.11.0's public Undici source into a private Set next to allocation, with source comments. Validate integer range 1..65535 separately (WHATWG also lists port 0).

Rationale: [WHATWG port blocking](https://fetch.spec.whatwg.org/#port-blocking), [Node's pinned constants](https://raw.githubusercontent.com/nodejs/node/v24.11.0/deps/undici/src/lib/web/fetch/constants.js), [requestBadPort](https://raw.githubusercontent.com/nodejs/node/v24.11.0/deps/undici/src/lib/web/fetch/util.js) and [mainFetch](https://raw.githubusercontent.com/nodejs/node/v24.11.0/deps/undici/src/lib/web/fetch/index.js) establish rejection before HTTP networking. The observed 6669 failure is explained by the pinned client. Research agent independently inspected the shared helper, tests and primary sources.

Alternatives considered: probing with Fetch adds networking and risks contacting a listener that is not owned; private Undici imports couple to unsupported runtime internals; changing the host ephemeral range changes user configuration; assuming only high ports misses configured host ranges. No new package is needed.

## Finite allocation and cleanup

Decision: default and hard upper bound 32 attempts, optional serverFactory plus maxAttempts 1..32 for deterministic tests. Each attempt uses bind(0, IPv4 loopback), observes a valid numeric port, closes, then accepts or retries. Invalid addresses close in finally. Factory/bind/close errors refuse rather than broad retries.

Rationale: the OS retains availability authority and each rejected candidate gets a fresh allocation, while a finite cap covers repeated restricted assignments. Native driver identity and original readiness deadlines stay independent.

Alternatives considered: a global mock affects concurrent tests; fixed port selection risks collisions; retaining a reservation cannot transfer the socket through the current driver interface. The existing release-before-child-bind race is not expanded into a TCP handoff redesign.

## Regression scope

Decision: deterministic fake server factories cover the full pinned restricted table, exhaustion, invalid controls/addresses and errors/cleanup. Existing real owned child/listener readiness, foreign identity and original deadlines remain. The unrelated-listener fixture must obtain its candidate through the helper too, then retain its foreign-identity assertion.

No external product contract or public documentation changes are needed. No unresolved research items remain.
