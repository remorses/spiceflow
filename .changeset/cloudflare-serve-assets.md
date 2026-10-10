---
'spiceflow': patch
---

Add `serveAssets` to `spiceflow/cloudflare` so `.use()` middleware can run before prerendered `staticPage()` routes on Cloudflare Workers. Set `assets.run_worker_first` in `wrangler.jsonc`, then register `serveAssets(env.ASSETS)` after the middleware that must run first. The Worker runs the middleware (redirects, auth checks, headers), then returns the prerendered `.html` or `.rsc` file from the assets binding without rendering again:

```tsx
import { env } from 'cloudflare:workers'
import { serveAssets } from 'spiceflow/cloudflare'

export const app = new Spiceflow()
  .use(({ request, redirect }) => {
    if (new URL(request.url).pathname === '/about-us') throw redirect('/about')
  })
  .use(serveAssets(env.ASSETS))
  .staticPage('/about', async () => <About />)
```

A redirect or error thrown by a middleware now stops the inner middlewares. Before, the chain kept going, so a later `serveStatic` or `serveAssets` could replace an auth redirect or 401 with the protected file. Register `cors()` before middlewares that throw if their error responses need CORS headers.

The response returned by `next()` now always has mutable headers. Before, `response.headers.set()` in a middleware threw "Can't modify immutable headers" when a handler returned a `fetch()` or `Response.redirect()` response.

Also fix `serveStatic` for client navigations to a root `staticPage('/')` or a trailing-slash path: it now serves the prerendered `/index.rsc` or `/about.rsc` instead of rendering the page again.
