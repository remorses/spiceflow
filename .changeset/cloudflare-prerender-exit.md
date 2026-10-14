---
'spiceflow': patch
---

Fix `vite build` never exiting on Cloudflare when wrangler config has remote bindings like `ai`. The prerender step now starts `vite preview` with only the Cloudflare plugin and `remoteBindings: false`, so no remote proxy session is opened and user plugins do not run again. The step is skipped when no server code calls `.staticPage()` or `.staticGet()`, and routes are fetched 8 at a time.
