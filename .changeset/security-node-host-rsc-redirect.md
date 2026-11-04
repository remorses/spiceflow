---
'spiceflow': patch
---

Fix four security issues. On Node, `listen()` and `handleForNode()` no longer let a request path like `//evil.com/x` replace the request host. That swap made `request.url` point at `evil.com` and let a cross-site form pass the server action `Origin` check. A browser landing on `//evil.com/x.rsc` is now redirected to `/evil.com/x` instead of off-site. The Node `serveStatic` stat cache is capped at 1000 entries, so unique 404 URLs can no longer grow memory without limit, and `GET /%00` or over-long paths fall through as not found instead of returning a 500 with a stack trace. The `mcp()` plugin now frees each SSE session when its connection closes.
