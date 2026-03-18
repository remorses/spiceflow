---
'spiceflow': patch
---

Add support for route handlers to set HTTP response headers through `props.response`, including API routes as well as page and layout handlers for normal React responses, so headers like `set-cookie`, `cache-control`, and custom values flow through document requests and client-side RSC navigations.
