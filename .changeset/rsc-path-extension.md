---
'spiceflow': patch
---

Restore `.rsc` path extension for client-side RSC navigation fetches. The client now appends `.rsc` to the pathname (e.g. `/about.rsc?__rsc=`) enabling CDN-friendly caching of RSC Flight data separately from HTML responses. The root `/` page uses `/index.rsc` instead of `/.rsc`. The `__rsc` query param is still sent alongside for backwards compatibility. Server-side route matching strips the `.rsc` suffix before matching, so dynamic params work correctly.

Restore HTML prerendering for `staticPage()` routes. The build now writes both `.rsc` (Flight data) and `.html` files to disk for each static route. The root `/` path writes `index.rsc` and `index.html`. The prerender manifest includes both file paths.
