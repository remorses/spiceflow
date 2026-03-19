---
'spiceflow': patch
---

Export `getDeploymentId` from the main `spiceflow` entry point. Returns the build-time deployment identifier (a base-36 timestamp), useful for cache keys, cache busting, and logging. Returns `''` in dev mode.
