---
'spiceflow': minor
---

Add `spiceflow/hono` adapter for using Hono middleware in Spiceflow apps.

The `honoMiddleware()` function wraps any Hono `MiddlewareHandler` so it works with Spiceflow's `.use()`. It constructs a real Hono `Context` so all standard Hono APIs work: `c.req`, `c.header()`, `c.status()`, `c.json()`, `c.text()`, `c.redirect()`, `c.set()`/`c.get()`, `c.var`, and `c.env`.

```ts
import { Spiceflow } from 'spiceflow'
import { honoMiddleware } from 'spiceflow/hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { bearerAuth } from 'hono/bearer-auth'

const app = new Spiceflow()
  .use(honoMiddleware(cors({ origin: '*' })))
  .use(honoMiddleware(logger()))
  .use('/api/*', honoMiddleware(bearerAuth({ token: 'secret' })))
  .get('/api/users', () => [{ name: 'Tommy' }])
```

For Cloudflare Workers, pass `env` to make bindings available on `c.env`:

```ts
.use(honoMiddleware(myMiddleware, {
  env: { API_KEY: 'sk-123', DB: myD1Binding },
}))

// Or derive env from spiceflow state:
.use(honoMiddleware(myMiddleware, {
  env: (ctx) => ctx.state.env,
}))
```
