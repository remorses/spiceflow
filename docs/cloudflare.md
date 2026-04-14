# Cloudflare

Cloudflare Workers setup, background tasks, and KV page caching.

## Cloudflare RSC Setup

For Cloudflare Workers, keep the worker-specific SSR output and child environment wiring in Vite, then let your Worker default export delegate to `app.handle(request)`.

```jsonc
// wrangler.jsonc
{
  "main": "spiceflow/cloudflare-entrypoint",
}
```

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import spiceflow from 'spiceflow/vite'

export default defineConfig({
  plugins: [
    react(),
    spiceflow({ entry: './src/main.tsx' }),
    cloudflare({
      viteEnvironment: {
        name: 'rsc',
        childEnvironments: ['ssr'],
      },
    }),
  ],
})
```

```tsx
// src/main.tsx
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().page('/', async () => {
  return <div>Hello from Cloudflare RSC</div>
})

export type App = typeof app

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

See [`example-cloudflare/`](../example-cloudflare) for a complete working example.

When you add or change bindings in `wrangler.jsonc`, run `wrangler types`. Wrangler regenerates `worker-configuration.d.ts`, which provides the global `Env` type and the typed `env` export from `cloudflare:workers`.

### Wrangler Environments

The `@cloudflare/vite-plugin` resolves and flattens your `wrangler.json` config at **build time** and writes it into `dist/rsc/wrangler.json`. When `wrangler deploy` runs, it reads this generated config — not your top-level `wrangler.json`. This means `wrangler deploy --env preview` alone is not enough if the build was done without specifying the environment.

Set the `CLOUDFLARE_ENV` env var during `vite build` so the plugin resolves the correct environment section:

```bash
# Build for preview environment
CLOUDFLARE_ENV=preview vite build && wrangler deploy --env preview

# Build for production (default, no env var needed)
vite build && wrangler deploy
```

Without `CLOUDFLARE_ENV=preview`, the generated `dist/rsc/wrangler.json` will contain the top-level config (production name, routes, KV namespaces, etc.) and `--env preview` will be ignored at deploy time.

## Background Tasks (`waitUntil`)

Spiceflow provides a `waitUntil` function in the handler context that allows you to schedule tasks in the background in a cross platform way. It will use the Cloudflare Workers `waitUntil` if present. It's currently a no-op in Node.js.

### Basic Usage

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'POST',
  path: '/process',
  async handler({ request, waitUntil }) {
    const data = await request.json()

    // Schedule background task
    waitUntil(
      fetch('https://analytics.example.com/track', {
        method: 'POST',
        body: JSON.stringify({ event: 'data_processed', data }),
      }),
    )

    // Return response immediately
    return { success: true, id: Math.random().toString(36) }
  },
})
```

### Cloudflare Workers Integration

In Cloudflare Workers, `waitUntil` is automatically detected from the global context:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow().route({
  method: 'POST',
  path: '/webhook',
  async handler({ request, waitUntil }) {
    const payload = await request.json()

    // Process webhook data in background
    waitUntil(
      processWebhookData(payload)
        .then(() => console.log('Webhook processed'))
        .catch((err) => console.error('Webhook processing failed:', err)),
    )

    // Respond immediately to webhook sender
    return new Response('OK', { status: 200 })
  },
})

async function processWebhookData(payload: any) {
  // Simulate time-consuming processing
  await new Promise((resolve) => setTimeout(resolve, 1000))
  // Save to database, send notifications, etc.
}

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

### Custom `waitUntil` Function

You can also provide your own `waitUntil` implementation:

```ts
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow({
  waitUntil: (promise) => {
    // Custom implementation for non-Cloudflare environments
    promise.catch((err) => console.error('Background task failed:', err))
  },
}).route({
  method: 'GET',
  path: '/analytics',
  async handler({ waitUntil }) {
    // Schedule analytics tracking
    waitUntil(trackPageView('/analytics'))

    return { message: 'Analytics page loaded' }
  },
})

async function trackPageView(path: string) {
  // Track page view in analytics system
  console.log(`Page view tracked: ${path}`)
}
```

**Note:** In non-Cloudflare environments, if no custom `waitUntil` function is provided, the default implementation is a no-op that doesn't wait for the promises to complete.

## KV Page Caching

Use middleware to cache full-page HTML in Cloudflare KV. The deployment ID is included in the cache key so each deploy gets its own cache namespace — this prevents serving stale HTML that references old CSS/JS filenames with different content hashes.

This example uses `import { env } from 'cloudflare:workers'` to access KV bindings directly from anywhere in your code, without threading env through `.state()`. Run `wrangler types` whenever the bindings change so `env.PAGE_CACHE` stays type-safe.

```tsx
import { Spiceflow, getDeploymentId } from 'spiceflow'
import { env } from 'cloudflare:workers'

export const app = new Spiceflow()
  .use(async ({ request, waitUntil }, next) => {
    if (request.method !== 'GET') {
      return next()
    }

    const url = new URL(request.url)
    const deploymentId = await getDeploymentId()
    const cacheKey = `${deploymentId}:${url.pathname}${url.search}` // IMPORTANT. cache key must always include search to distinguish html and rsc responses

    const cached = await env.PAGE_CACHE.get(cacheKey)
    if (cached) {
      return new Response(cached, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'x-cache': 'HIT',
        },
      })
    }

    const response = await next()
    if (!response || response.status !== 200) {
      return response
    }

    const html = await response.text()
    // Write to KV in the background so the response is not delayed
    waitUntil(
      env.PAGE_CACHE.put(cacheKey, html, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      }),
    )

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-cache': 'MISS',
      },
    })
  })
  .page('/', async () => {
    return (
      <div>
        <h1>Home</h1>
      </div>
    )
  })

export default {
  fetch(request: Request) {
    return app.handle(request)
  },
}
```

When a new version is deployed the build timestamp changes, so `getDeploymentId()` returns a different value and all cache keys are effectively new. Old entries expire naturally after 7 days.
