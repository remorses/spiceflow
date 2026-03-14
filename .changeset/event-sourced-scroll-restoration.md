---
'spiceflow': patch
---

Refactor `ScrollRestoration` to derive navigation and scroll state from a bounded router event log instead of mirrored module globals. This keeps refresh detection and scroll position restoration reproducible while preserving the existing top, hash, back/forward, and refresh behavior across RSC navigations.
