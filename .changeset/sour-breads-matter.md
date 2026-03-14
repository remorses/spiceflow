---
'spiceflow': patch
---

fix `HEAD` handling to reuse `GET` route metadata while still returning an empty body, preserve repeated empty query values like `?tag=&tag=two`, and make request bodies reusable across middleware and handlers for JSON routes. CORS middleware now mutates response headers in place instead of rebuilding responses from consumed bodies, which keeps body-less `HEAD` responses and normal responses consistent.
