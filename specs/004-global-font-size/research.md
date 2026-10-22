# Research: Global font size

Decision: Add optional-on-read fontScale80|90|100 default100. Rationale: Rust serde defaults preserve prior preference documents without migration or a format bump; unsupported values follow existing recovery. Alternative required field rejected because it would invalidate current user settings.

Decision: Scale body text through inherited CSS and a document custom property. Rationale: delivered controls use font:inherit, product information/captions inherit text size and portal content remains in body. Root rem values stay fixed so existing spacing and target sizes remain stable. Alternative root font-size/zoom rejected because it changes layout/media scale.

Authority: existing constitution, current configuration/browsing documentation and pinned brand consumer/implementation contracts. Governed kit files are unchanged. A read-only research agent confirmed these integration points.
