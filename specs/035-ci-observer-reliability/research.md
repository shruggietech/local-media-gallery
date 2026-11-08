# Research: CI observer reliability

## 2026-11-08: existing failures and proportional repairs

### Linux recording delivery

**Decision**: Request `--latency-msec=50` from parec for both tone and no-input control. Preserve all 16384 frames, four seconds, ownership/sink continuity and no-input checks. Retain precise bounded progress and partial-data digest as diagnostics only.

**Evidence**: PulseAudio 16.1 recorder leaves recording fragsize server-selected without a latency argument; explicit latency sets recording fragsize and PA_STREAM_ADJUST_LATENCY. Server recording defaults and null-sink render blocks are two seconds; monitor-source requests participate in sink latency selection.

**Primary sources**: [pacat recorder](https://raw.githubusercontent.com/pulseaudio/pulseaudio/v16.1/src/utils/pacat.c), [native protocol defaults](https://raw.githubusercontent.com/pulseaudio/pulseaudio/v16.1/src/pulsecore/protocol-native.c), [null sink](https://raw.githubusercontent.com/pulseaudio/pulseaudio/v16.1/src/modules/module-null-sink.c), [monitor latency propagation](https://raw.githubusercontent.com/pulseaudio/pulseaudio/v16.1/src/pulsecore/sink.c).

**Alternatives rejected**: Accepting 65516/65520 bytes weakens the complete-window contract; longer deadlines hide buffering; synthetic audio would invalidate no-input silence. Playback process-time/minreq is the wrong recording control. The precise reason for the historical 16/20 missing bytes remains unproven; fresh actual hosted evidence is required.

### Windows request, process and diagnostic lifetime

**Decision**: Retain durable pre-call checkpoints; clip requests and cleanup to the shared clock. Separate exit from pipe closure and finalize a failed operation even when owned termination does not produce exit. Closing must not await the request queue before its timeout begins.

**Evidence**: Current promisified execFile may await inherited output handles; observer.close awaits its queue before bounded shutdown; outer execute waits for an exit after its termination attempt. Failure packets otherwise appear only after those waits settle. Existing CI restoration/upload already use always(), but cannot run while the prior controller stays blocked.

**Primary source**: [Node 24.11.0 child process exit, close, kill and error semantics](https://nodejs.org/download/release/v24.11.0/docs/api/child_process.html).

**Alternatives rejected**: Killing by image name risks unrelated actors; reporting kill request as termination is false; merely extending request/qualification timeouts preserves the hang and loses the same diagnostics. A host outage remains outside the guarantees of an in-process checkpoint writer.

### macOS fault admission

**Decision**: Revalidate current-operation process birth, parent/path/digest and intent generation; wait for actual stopped status before inspecting an admitted partial boundary. Resume an unadmitted stopped actor. Revalidate before subsequent signals and retain signal errno/outcome, phase and terminal Installer facts on a miss.

**Evidence**: Current code caches the first matching helper PID before waiting for admitted intent. SIGSTOP success only requests a stop; installation may otherwise cross the boundary before it is actually stopped. PackageKit can parent scripts via its daemon, so Installer ancestry alone is an invalid assumption. Existing Swift exit-based failure paths can bypass deferred cleanup.

**Alternatives rejected**: First path/hash match without process birth/operation binding; assuming helper parents descend directly from the Installer client; counting completed installation or an unobserved signal as fault success; broad process-name termination.

### Published product versus observer provenance

**Decision**: Qualify the repaired harness at the PR head and independently verify the unchanged public v0.2.2 canonical source, Lite asset and prepared gallery. Retain both identities explicitly in evidence. Do not republish or replace artifacts.

**Rationale**: Fixing the observer necessarily changes its source digest; it does not alter the delivered product selected from the canonical release. Existing receipt/byte/archive/native validators remain authoritative in their own roles.

SDK process identity layout and constants use [Apple proc_info.h](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/sys/proc_info.h) and the [libproc declarations](https://github.com/apple-oss-distributions/xnu/blob/main/libsyscall/wrappers/libproc/libproc.h). No copied field offsets are used.

The first S035 hosted attempt confirmed STOP, correct intent generation, live-authority refusal and successful KILL, then exposed an observer retirement bug: PROC_PIDTBSDINFO with arg=0 omitted an unreaped exit while kill(pid,0) still succeeded. [Apple procpidinfo](https://github.com/apple-oss-distributions/xnu/blob/main/bsd/kern/proc_info.c) explicitly enables zombie lookup for the BSD-info flavors when arg is nonzero. Query with arg=1 and inspect actual retained birth/status; do not infer retirement from the signal return. A real owned unreaped-child compiled regression covers this distinction. Signal history is bounded as well as observation history.
