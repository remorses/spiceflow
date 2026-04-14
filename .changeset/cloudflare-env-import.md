---
'spiceflow': patch
---

Simplify the Cloudflare Workers examples to read bindings with `import { env } from 'cloudflare:workers'` instead of threading `env` through app state, and document that `wrangler types` regenerates `worker-configuration.d.ts` so bindings stay type-safe.
