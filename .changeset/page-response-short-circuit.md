---
'spiceflow': patch
---

Simplify React page and layout `Response` handling so non-404 responses short-circuit as raw HTTP responses while 404 responses still render through the existing app not-found flow. This makes `return new Response("forbidden", { status: 403 })` behave like a normal document response instead of going through RSC response serialization.
