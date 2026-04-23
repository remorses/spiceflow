---
'spiceflow': patch
---

Add resolved path type checking to `createSpiceflowFetch()` so typed fetch calls now accept interpolated route strings like ``f(`/users/${id}`)`` while preserving route-specific request and response inference.
