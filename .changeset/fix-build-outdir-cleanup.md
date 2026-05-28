---
'spiceflow': patch
---

Fix production build crash (`ENOENT: __vite_rsc_assets_manifest.js`) caused by the `buildStart` hook wiping all environment output directories on every `builder.build()` call. The plugin-rsc pipeline runs 5 sequential build steps; step 5 (SSR) would delete `dist/rsc/` (built in step 3) and `dist/client/` (built in step 4), then `writeAssetsManifest` would fail trying to write into the deleted directory. The cleanup now runs exactly once before the first build step.
