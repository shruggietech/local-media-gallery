# S039 implementation plan

1. Adopt the prototype's static Next.js interface and Go host under `apps/portable`, importing the installed brand kit. Use the browser profile of AppFrame and the governed dialog for settings and path entry.
2. Keep the directory selection, recursive refresh and media ranges in Go. Use a loopback launch session, root-relative file handles, and gallery and asset revision checks. Store snapshots, favorites, and presentation in one private SQLite database per gallery. A failed refresh keeps the previous completed snapshot.
3. Serve static files and internal gallery endpoints from the embedded Go binary. Generate previews when visible. Use the browser for video decoding and posters.
4. Build one portable archive per target. Run repository checks and the shared extracted-archive smoke test in the branch-scoped runner matrix. Keep package and desktop evidence distinct. Present results for owner review.
