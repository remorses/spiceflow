---
'spiceflow': patch
---

fix React.cache() in server components by deduplicating React module resolution across RSC and SSR environments. The vendored react-server-dom inside @vitejs/plugin-rsc uses `require("react")` which could resolve to a separate React instance under pnpm's strict module isolation, causing `ReactSharedInternals.A` (the cache dispatcher) to be set on one instance while user code reads from another. Adding `resolve.dedupe` for React packages forces all resolution to go through the project root, ensuring a single shared instance. This fixes Head/CollectedHead tag collection (title, meta, link, favicon) which relies on React.cache() for the per-render shared store.
