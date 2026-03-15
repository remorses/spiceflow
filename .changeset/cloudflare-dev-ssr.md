---
'spiceflow': patch
---

Fix Cloudflare Vite RSC apps across development and preview/deploy builds. Spiceflow now keeps the document Flight -> HTML bridge inside `app.handle()`, so Cloudflare can run `rsc` and child `ssr` in the same worker graph during dev while user-defined Worker default exports can still just call `app.handle(request)`. `spiceflowCloudflareViteConfig()` still places the SSR build in `dist/rsc/ssr` for preview and deploy.
