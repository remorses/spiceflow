---
'spiceflow': patch
---

Fix Cloudflare Vite RSC apps across development and preview/deploy builds. Spiceflow now lets `@cloudflare/vite-plugin` own request handling during dev and exports `spiceflowCloudflareViteConfig()` so apps can keep the worker-specific SSR build output in `dist/rsc/ssr` without repeating that setup in each Vite config.
