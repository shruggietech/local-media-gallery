# S014 Research Decisions

## 2026-10-27: Native automation

Decision: reuse the installed embedded native WebDriver, which supports WebView2, WebKitGTK and WKWebView. External tauri-driver's macOS limitation does not apply to this provider. Keep bounded direct W3C requests and native snapshots; its JavaScript clicks/keys/computed labels are not native input/AX proof. Queue AppKit NSEvent pairs in-process on macOS, use native X11 input under private Xvfb/DBus on Linux, and retain foreground-confirmed Windows input. Assert trusted event/default behavior on each actual runtime.

Alternatives: new eval/result protocol and external Chromium rejected as redundant or the wrong runtime. Cross-process macOS event posting/TCC prompts avoided for native keyboard automation; provider traversal remains explicitly distinct from external screen-reader speech.

Sources: [Tauri WebDriver](https://tauri.app/develop/tests/webdriver/), [Tauri CI](https://tauri.app/develop/tests/webdriver/ci/), [NSEvent constructor](https://developer.apple.com/documentation/appkit/nsevent/keyevent%28with%3Alocation%3Amodifierflags%3Atimestamp%3Awindownumber%3Acontext%3Acharacters%3Acharactersignoringmodifiers%3Aisarepeat%3Akeycode%3A%29), [WKPreferences keyboard focus](https://developer.apple.com/documentation/webkit/wkpreferences/tabfocuseslinks), [DBus session lifetime](https://dbus.freedesktop.org/doc/dbus-run-session.1.html). Installed plugin1.5.0 executor/platform code was inspected. Mechanisms still require actual elected runtime execution.

## 2026-10-27: Media observations

Decision: separate synthetic corpus, known quadrants/alpha, seven representative formats, all eight EXIF orientations, tagged/untagged SDR color, H264/AAC and VP9/Opus moving clips, 440Hz tone plus silent control. Existing clip audio is anullsrc; muted=false does not qualify decoded audio. Use actual media element WebAudio analyser samples with explicit graph/output limits. Existing anonymous media and strict reflected origin already permit canvas/audio access; no wildcard change.

Alternatives: broad codec promises, extension/canPlayType hints, first-frame-only playback and animation inferred from canvas rejected. Canvas uses current video frames but default/first animated-image frame by specification. Known unsupported media remains inspectable and is recorded per runtime.

Sources: [canvas sources](https://html.spec.whatwg.org/multipage/canvas.html#image-sources-for-2d-rendering-contexts), [canvas color conversion](https://html.spec.whatwg.org/multipage/canvas.html#color-spaces-and-color-space-conversion), [WebAudio media sources](https://www.w3.org/TR/webaudio-1.0/#MediaElementAudioSourceNode), [Pillow ImageCms](https://pillow.readthedocs.io/en/latest/reference/ImageCms.html), [FFmpeg sine](https://ffmpeg.org/ffmpeg-filters.html#sine), [WebKitGTK multimedia](https://docs.webkit.org/Ports/WebKitGTK%20and%20WPE%20WebKit/Multimedia.html).

## 2026-10-27: Native assistive evidence

Decision: bounded actual UIA/AT-SPI/provider snapshots and real NVDA focus/item speech-generation observations on Windows. Isolate a new portable NVDA profile, disable updates/statistics/start sounds and use built-in silence synth; capture only bounded synthetic-gallery speech via pre_speech. Detect existing owner NVDA before startup and never replace/quit it. Native provider/AX exposure and speech, audio, physical touch and display calibration remain separately named claims.

NVDA2026.3 publisher download: https://download.nvaccess.org/releases/2026.3/nvda_2026.3.exe ; published SHA256 a8a87cb823da0c62cfbae4a444ae5ae238d54dc82ad6d46d3fdb3fef082799b2. Preparation records exact bytes, hash, version and associated license; it is not product payload.

Sources: [NVDA2026.3 release](https://www.nvaccess.org/post/nvda-2026-3/), [configuration source](https://raw.githubusercontent.com/nvaccess/nvda/release-2026.3/source/config/configSpec.py), [silence synthesizer](https://raw.githubusercontent.com/nvaccess/nvda/release-2026.3/source/synthDrivers/silence.py). Existing Windows native-input uses UIAutomationClient. Potential panorama target, narrow viewer clipping and changing-item announcement risks must be reproduced before product fixes.

## 2026-10-27: Workflow and authority

Decision: all installed Spec Kit stages and no extension hooks (file absent). The checklist helper initially required a plan file although autopilot sequences checklist first; create the installed plan template, then resolve the checklist template before completing design. This is a helper prerequisite ordering adjustment, not a skipped requirements review. Source qualification/review cap and automatic push authorization remain unchanged.
