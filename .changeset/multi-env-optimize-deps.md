---
'spiceflow': patch
---

fix multi-environment Vite dep optimization in dev by enabling dependency discovery for the `ssr` and `rsc` environments and forcing `holdUntilCrawlEnd` across all Spiceflow environments. This makes `optimizeDeps.entries` actually apply outside the client environment, which reduces cold-start re-optimization rounds, avoids mid-request dependency discovery, and makes first requests in RSC/SSR setups more reliable.
