---
'spiceflow': patch
---

Propagate loader `response.status` and `response.headers` to the flight and HTML responses. Previously, status codes set in loaders (e.g. `response.status = 404`) were silently discarded and the response always returned 200. Now loader status is used as a fallback when neither the page nor any layout sets a non-200 status. Loader headers are also merged into the response, with page/layout headers taking precedence.
