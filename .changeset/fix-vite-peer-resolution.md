---
'spiceflow': patch
---

Fix `spiceflow/vite` package resolution in pnpm workspaces by declaring Vite 8 as a required peer dependency. The Vite plugin now resolves the consumer's Vite 8 installation instead of an unrelated hoisted Vite 7 package.
