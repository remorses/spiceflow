---
'spiceflow': patch
---

fix client-side `router.push()` to follow HTTP 302 redirects from `.get()` route handlers via SPA navigation instead of triggering a full page reload. When a `.get()` handler returns a redirect response (e.g. `new Response(null, { status: 302, headers: { Location: '/target' } })`), the client router now detects the redirect and does `router.replace('/target')` to preserve layout state, scroll position, and avoid a jarring full page reload.
