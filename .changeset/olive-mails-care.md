---
'spiceflow': patch
---

Fix Cloudflare local dev when `spiceflow` is linked from another repo by overriding the dev-only RSC/SSR/client entry inputs to the app-local `node_modules/spiceflow/dist/react/*` files. This keeps `@cloudflare/vite-plugin` on the worker-side `loadModule` path while avoiding absolute realpaths outside the app that workerd cannot import.
