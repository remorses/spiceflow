---
'spiceflow': patch
---

Fix React page and layout handlers that return `Response` values so redirects short-circuit correctly and returned `notFound()` responses render through the existing 404 flow instead of crashing RSC serialization with `Only plain objects` errors during browser navigation.
