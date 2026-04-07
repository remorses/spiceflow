---
'spiceflow': patch
---

Fix standalone output tracing to resolve the active build environment output directory before copying dependencies, and fix base-path handling for client navigation and federated payload client-module URLs so non-root deployments keep working in dev, start, and standalone builds.
