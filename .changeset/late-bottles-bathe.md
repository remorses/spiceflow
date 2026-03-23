---
'spiceflow': patch
---

add an experimental `SPICEFLOW_SSR_CACHE_MODE=prehash` mode for benchmarking a cache path that hashes the RSC flight stream before SSR, and expand the node benchmark `/about` route so heavier JSX trees make SSR cache tradeoffs easier to measure.
