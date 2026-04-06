---
'spiceflow': patch
---

Simplify `decodeFederationPayload(response)` to return the decoded value directly instead of transport metadata, so imperative client code can use the result without unpacking `.value`. The lower-level federation metadata and SSR details stay internal to the rendering helpers.
