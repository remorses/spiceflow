---
'spiceflow': patch
---

Strip dev-only `findSourceMapURL` function from production client and SSR builds. The function references `/__vite_rsc_findSourceMapURL`, a Vite dev endpoint that causes webpack/turbopack to fail when the built output is consumed by another bundler (e.g. Next.js catch-all route handler). The function is now replaced with a no-op during `vite build` since React never calls it in production.
