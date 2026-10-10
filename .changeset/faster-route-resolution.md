---
'spiceflow': patch
---

Less routing work per request. Matched requests no longer copy every route of every app to decide whether to render a React 404, and no longer run one router lookup per route of each non-matching sub app. Both checks now run only when no route matched. In an app with 361 routes, `resolveRoutes` went from 11.8 µs to 0.3 µs and `match` from 3.7 µs to 1.9 µs per request.
