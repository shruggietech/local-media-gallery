# Data model: S036

- Navigation category: Gallery, View, Prepare & share, Settings or Help, with fixed ordered child destinations from FR-003.
- Navigation route: root/category/task; parent relationships are finite and typed. Opening a shortcut initializes the appropriate task path. Explicit Back returns one level; closing resets the transient path.
- Navigation focus: actual invoking HTMLElement plus per-level menu target; disconnected targets use a surviving Menu button or main. Never persist focus/route in settings.
- Gallery identity: current display absolute path and derived basename. Keep source path authority unchanged; wrapping/copying must not truncate the display string.
- Settings destination: existing SaveDestination union and existing settings queue. Editors share one destination authority, use unique DOM IDs, and show it before mutation. Gallery-only destinations retain their current disabled rules.
- Operation state: existing guided preview/job identity and thumbnail job/controller. Their lifetime is the session, not a route component. Thumbnail destination draft remains local UI state retained at stable lifetime.
- Native evidence: current-candidate drawer-v1 hierarchy traversal is source-bound; legacy published controls remain explicit historical behavior. Existing controlsExpanded values and portable/settings records are unchanged.

No persistent schema migration, new settings field or wire-version change is required.
