---
'spiceflow': patch
---

Fix API routes being shadowed by layout-only React route matches. When a request path like `/api/hello` matched both a `layout('/*')` and a `.get('/api/hello')` handler, the framework incorrectly entered the React rendering path (because `reactRoutes` was non-empty from the layout match), then returned 404 since no page route existed. Now the route matching logic checks whether `reactRoutes` contains an actual page or staticPage match before taking priority over API route handlers.
