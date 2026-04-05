---
'spiceflow': patch
---

fix Vite 8 dev-server crash "Cannot destructure property 'exportsData'" that happened under pnpm installs. Commit 11a7359 switched `optimizeDeps.include` entries to absolute paths returned by `require.resolve`, which under pnpm always flow through `.pnpm/@scope+pkg@version/` directories. Vite's `flattenId` does not escape `+` but rolldown normalises `+` to `_` in chunk filenames, producing a key mismatch that crashes the optimizer. Revert to the `'spiceflow > dep'` nested-id syntax — Vite's `nestedResolveBasedir` respects `preserveSymlinks` internally, so pnpm `+` paths are never produced. Wrapper plugins that nest spiceflow under their own package (so `spiceflow` isn't resolvable from the project root) should rewrite `optimizeDeps.include` entries themselves, prefixing `'spiceflow > ...'` with their own package name (e.g. `'@holocron.so/vite > spiceflow > ...'`).
