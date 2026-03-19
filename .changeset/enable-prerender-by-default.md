---
'spiceflow': patch
---

Enable prerendering by default for `staticPage()` routes. Previously gated behind an unused `SPICEFLOW_ENABLE_BUILD_PRERENDER` env var, prerendering now runs automatically during `vite build --app`. It generates `.rsc` Flight data files at build time so client-side navigations to prerendered pages are served from disk via `serveStatic` instead of re-rendered dynamically. Also adds the `rsc` mime type (`text/x-component`) to the static file server so prerendered `.rsc` files are served with the correct content-type. Cloudflare builds are skipped since their SSR entries use `cloudflare:` protocol imports that can't run in Node.js at build time.
