# Splitting Large Workers with Service Bindings

When your Worker bundle exceeds the **10 MiB free tier** (or 25 MiB paid) limit, usually because of WASM modules, image libraries, or other heavy dependencies, you can extract the expensive code into a **separate dedicated Worker** and call it from the main Worker via a [Cloudflare service binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/). Service binding calls execute on the same thread with near-zero latency; there is no network hop.

Service bindings connect **two independently deployed Workers**, each with its own bundle size budget.

```
┌──────────────────────────────────────────────┐       ┌─────────────────────────────────────────────┐
│  Main Worker (Spiceflow + Vite)              │       │  Dedicated Worker (Spiceflow only)          │
│                                              │       │                                             │
│  /            ──▶ React pages                │       │  /api/og ──▶ renderOgImage()                │
│  /dashboard   ──▶ React pages                │       │              (WASM, heavy deps)             │
│                                              │       │                                             │
│  /api/og ────────────────────────────────────┤──────▶├  No Vite plugin needed                      │
│          env.OG_WORKER.fetch(request)        │       │                                             │
└──────────────────────────────────────────────┘       └─────────────────────────────────────────────┘
```

## Service binding config

Add a `services` entry in the main Worker's `wrangler.jsonc`. Each environment needs its own binding pointing to the correct worker name for that environment.

```jsonc
// main worker wrangler.jsonc
{
  "services": [
    { "binding": "OG_WORKER", "service": "my-og-worker" }
  ],
  "env": {
    "preview": {
      "services": [
        { "binding": "OG_WORKER", "service": "my-og-worker-preview" }
      ]
    }
  }
}
```

Run `wrangler types` after adding the binding so `env.OG_WORKER` is typed.

## Proxy route in the main Worker

The main Worker adds a single route that forwards the request to the dedicated Worker. The response comes back directly; no serialization or network overhead.

```tsx
// main worker src/main.tsx
import { Spiceflow } from 'spiceflow'
import { env } from 'cloudflare:workers'

export const app = new Spiceflow()
  .page('/', async () => <div>Home</div>)
  .get('/api/og', ({ request }) => env.OG_WORKER.fetch(request))

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

## Dedicated Worker

The dedicated Worker is a standalone Spiceflow app. Since it has no React pages, it does not need the Vite plugin or any RSC setup. Use a dynamic `import()` inside the handler to keep the heavy dependency out of the cold-start path; the module is only loaded when the route is actually called.

```tsx
// dedicated worker src/main.tsx
import { Spiceflow } from 'spiceflow'
import { z } from 'zod'

const querySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
})

export const app = new Spiceflow().route({
  method: 'GET',
  path: '/api/og',
  query: querySchema,
  async handler({ query }) {
    // Dynamic import keeps WASM out of the cold-start path
    const { renderOgImage } = await import('./og.tsx')
    return renderOgImage(query)
  },
})

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

## Deployment order

Deploy the dedicated Worker first (or alongside the main Worker). Both Workers need their own `wrangler.jsonc` with preview and production environment configs. The main Worker's service binding resolves at request time, so the dedicated Worker must be live before the main Worker can call it.

```bash
# Deploy dedicated worker first
cd my-og-worker && wrangler deploy

# Then deploy main worker
cd my-main-worker && wrangler deploy
```
