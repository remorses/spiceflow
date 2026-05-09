---
'spiceflow': patch
---

Fix CSS not loading in cloudflare dev mode. The `virtual:app-entry` module isn't registered in the RSC module graph when using the cloudflare vite plugin (workerd uses its own `worker-entry`), so `collectCss` couldn't find any CSS files. The fix rewrites `loadCss('virtual:app-entry')` to use the actual resolved entry file path, which IS in the module graph.
