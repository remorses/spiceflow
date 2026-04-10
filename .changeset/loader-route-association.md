---
'spiceflow': patch
---

Prevent loaders from running as standalone route matches. Loaders now only execute when the request also matches a React page or layout, and the README now documents that standalone content should use `.get()` or another API route instead.
