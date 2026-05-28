---
'spiceflow': patch
---

Fix duplicate module instances when spiceflow is a transitive dependency under pnpm. Replaces `resolve.dedupe` (which silently fails for transitive deps) with a `resolveId`-based singleton enforcement that re-resolves `spiceflow`, `react`, and `react-dom` from spiceflow's own directory. This ensures all importers converge on the same physical files while still respecting per-environment package.json exports conditions (`react-server`, `ssr`, `browser`).
