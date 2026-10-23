# S007 data model

The existing manifest remains the authority for latest, retained versions, topics, captured references, schema and published-release records. Rendered Page adds headings (id/title/level), description and build-rendered diagram figures while retaining route/version/topic/raw/source hash relationships. Alias resolution maps only known inventory routes to explicit retained routes.

Code figures contain language, highlighted HTML and a data-marked plain code element. Exact source text, including its trailing newline, is copied from textContent. Status text is runtime feedback and never source content.

Diagram metadata maps a SHA256 of canonical Mermaid source to a title and relationship description. Every discovered graph requires one entry. Build output has light and dark SVGs, deterministic prefixed IDs, local-only references and a visible caption/source disclosure. Duplicate content instances receive distinct instance IDs.

A staged asset record binds the public path, governed source path, size and hash. Manifest dependencies resolve at the site root. Metadata records title, description, canonical route, social image dimensions and alt text; sitemap entries include only canonical public HTML routes.

Quality evidence records source revision/digest, viewport/theme, route, request sizes, sample timings, accessibility results and screenshots. Preparation, qualification and combined clocks remain separate. Generated evidence never becomes canonical documentation source.
