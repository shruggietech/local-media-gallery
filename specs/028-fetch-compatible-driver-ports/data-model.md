# S028 allocation data model

- Candidate: integer port 1..65535 observed from a successfully bound IPv4 loopback server. Restricted numeric values are rejected after close.
- Temporary server: created -> bind succeeds -> address observed -> close completes -> accept/retry. Bind failure refuses; invalid address still closes; close failure refuses.
- Attempt budget: integer 1..32, default 32. Exhaustion refuses without an additional factory call.
- Driver identity: existing PID/nonce or historical listener-PID path; unchanged and independent from allocation.
- No persistent data, schema, package or product contract changes.
