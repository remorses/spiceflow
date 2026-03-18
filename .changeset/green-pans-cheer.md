---
'spiceflow': patch
---

add a production SSR HTML cache for fast React Server Component pages, keyed by a progressive hash of the flight stream and bounded by total byte size. The cache skips non-GET requests, responses with `Set-Cookie`, and can be disabled with `SPICEFLOW_DISABLE_SSR_CACHE=1` for benchmarking or debugging.
