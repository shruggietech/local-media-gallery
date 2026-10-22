# S002 data model

## Session and observation

A gallery session owns an unpredictable ID/token, native root path and capability directory handle, status/issues, observation revision, cancellation signal and native-name/item map. Only one scan is admitted. Scan results apply only to their originating session/generation. A valid new root retires prior access; failed selection preserves the prior session.

States are selection, scanning, complete/partial, unavailable and retired. Unavailable is not successful empty discovery. Root/session replacement cancels pending work and streams.

## Item and resource grant

Each item has an opaque ID/revision, backend-only native filename, display/relative label, category, MIME hint, optional decimal-string bytes/modified milliseconds and attributable issue. Metadata and notification observations invalidate revisions. Actual renderer decode supplies dimensions/duration keyed by revision, without pretending extension proves support.

Candidate images: jpg/jpeg/png/webp/gif/avif/bmp/tif/tiff. Candidate videos: mp4/m4v/mov/webm/mkv/avi. Required native cases are JPEG/PNG/WebP and the nominated MP4 clips. SVG/HTML/executable documents are not active media documents.

A readonly grant requires current token/item/revision. No request supplies a native path. Opening rechecks no-follow regular-file facts under the root handle. Changed/linked/stale resources fail explicitly. Streaming chunks are bounded, and cancellation/client disconnect releases file resources.

## Collection view

Session-only filter all/image/video, sort name/modified/size, direction, selection and position. Missing facts sort last in both directions. Natural case-insensitive filename comparison has an exact label tie-breaker; it never changes actual filesystem paths.

## Persistence and version

No gallery settings/history/database or source writer exists in this slice. Framework caches outside the gallery are runtime facilities. Software, versioned documentation and the master runtime schema share 0.0.0; the brand retains its separate pinned identity. External sidecars remain arbitrary and unread here.
