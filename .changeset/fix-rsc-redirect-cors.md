---
'spiceflow': patch
---

Fix CORS error when a page redirects to an external URL during client-side navigation. When a `.page()` handler returns a redirect to a cross-origin URL (e.g. OAuth provider like Google), the browser's `fetch()` would auto-follow the 302 and hit the external domain, which blocks the request due to missing CORS headers. The server now wraps redirects as a 200 response with `x-spiceflow-redirect` headers for RSC requests, and the client reads those headers to perform the redirect via `hardNavigate()` or `router.replace()` instead of letting `fetch()` follow the redirect.
