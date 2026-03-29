---
'spiceflow': patch
---

Add `.staticGet()` method for pre-rendering API routes at build time. Works like `.get()` but the handler runs once during `vite build` and the response body is written to `dist/client/` as a static file. In development the handler runs normally on every request. Useful for endpoints like `/api/manifest.json`, `/robots.txt`, or `/sitemap.xml` that can be fully resolved at build time.
