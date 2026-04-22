---
'spiceflow': patch
---

add `serverTiming: true` on the `Spiceflow` constructor to expose request spans as a `Server-Timing` response header for Chrome DevTools. The header includes built-in framework spans and custom spans started from `context.tracer`, with nested descriptions like `GET /users/:id > handler - /users/:id > db.query` so slow queries are easy to inspect in the browser.
