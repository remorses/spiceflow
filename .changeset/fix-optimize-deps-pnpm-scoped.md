---
'spiceflow': patch
---

fix Vite 8 dev-server crash "Cannot destructure property 'exportsData'" when spiceflow's `optimizeDeps.include` contains an absolute path to a pnpm-scoped package. pnpm encodes scoped packages as `@scope+pkg` inside `.pnpm/`, but rolldown normalizes `+` to `_` in chunk filenames while Vite's `flattenId` leaves `+` untouched — producing a key mismatch that crashes the optimizer. `tryResolve` now rewrites the resolved path to go through the symlink under spiceflow's own `node_modules`, so the returned path never contains `+`.
