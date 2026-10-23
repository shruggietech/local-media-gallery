# Research: Website foundation

## 2026-10-23

Spec Kit plan dispatched separate documentation and CI research agents; neither edited source. Findings were consolidated before implementation.

### Rendering

Decision: Markdown-it build-time rendering with HTML disabled, Highlight.js, and docs-only Mermaid. Rationale: real CommonMark parser and table support fit fifteen chapters without a docs-framework migration. Alternatives: react-markdown/remark (valid but more plugin plumbing), a full docs framework (unnecessary shell/brand coupling), regex renderer (rejected for incorrect Markdown/link semantics).

Decision: Explicit snapshot manifest and allowlisted source-to-route mapping. Rationale: current chapters link outside docs to changelog, security, schema and specific brand references. Retain per-version assets/raw references with hashes; no whole-repository publishing. Heading IDs use parsed plain text and duplicate suffixes.

Decision: Static index/latest pages and explicit missing-topic fallback; version-scoped prebuilt search. Rationale: static export cannot use server redirects and history must not silently show latest content.

### Qualification

Decision: Hosted Windows product checks plus repository/site checks use shared commands. Interactive native input requires a logged-in desktop, distinct from service/hosted compilation. Provide an automated self-hosted desktop dispatch path without an attended owner gate.

Decision: Qualification records capture failures/timeouts as well as success, include exact git/source/artifact identity and enforce a deadline while retaining finalization reserve. Existing runner checked the reserve only between commands and omitted failed steps; correct these proportional defects when introducing hosted accounting.

### Primary references

- [Next static export](https://nextjs.org/docs/app/guides/static-exports)
- [Markdown-it security and API](https://github.com/markdown-it/markdown-it)
- [Mermaid usage/security](https://mermaid.js.org/config/usage.html)
- [Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [Required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Windows interactive services](https://learn.microsoft.com/en-us/windows/win32/services/interactive-services)
