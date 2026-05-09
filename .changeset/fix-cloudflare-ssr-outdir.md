---
'spiceflow': patch
---

Fix `ssr.build.outDir` being overridden by `@cloudflare/vite-plugin` regardless of plugin registration order. The cloudflare plugin unconditionally sets `outDir: dist/ssr` (sibling) which breaks workerd module resolution with `No such module "../ssr/index.js"` errors. Spiceflow now uses a `configResolved` hook to force the correct nested `dist/rsc/ssr` path after all config merging is done, so the fix works regardless of whether `cloudflare()` is registered before or after `spiceflow()` in the Vite config.

Related upstream issue: https://github.com/cloudflare/workers-sdk/issues/13869
