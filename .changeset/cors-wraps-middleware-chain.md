---
'spiceflow': patch
---

Fix CORS for apps that register `cors()` after a middleware that throws. Since thrown middleware errors stop the chain, `.use(auth).use(cors())` returned 401s without CORS headers, and every preflight `OPTIONS` request failed because preflights carry no credentials. `cors()` now always runs first among the middlewares in scope, wherever it is registered, so error responses, redirects and preflights get CORS headers again.
