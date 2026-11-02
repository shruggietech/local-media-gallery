# Pinned build sources

The FFmpeg archive is an unchanged upstream source release used to build the bundled Full thumbnail helper. Keeping this verified input in the repository makes ordinary source builds independent of upstream download availability. The source archive and build recipe are also included in Full installations.

- Upstream: [FFmpeg 9.0.2 source](https://ffmpeg.org/releases/ffmpeg-9.0.2.tar.xz).
- Bytes: 12040788.
- SHA256: 8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e.
- License and corresponding source notices are contained in the unchanged archive. The build disables GPL, nonfree and version3 components; configuration and dependency notices are recorded by scripts/prepare-feature-helper.mjs.

Update the source identity in scripts/prepare-feature-helper.mjs deliberately when replacing this archive. Every acquisition and cached reuse verifies the pinned bytes.
