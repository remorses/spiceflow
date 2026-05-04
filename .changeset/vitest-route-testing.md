---
'spiceflow': minor
---

Add vitest support for testing page routes, API routes, and server actions without a full RSC environment.

When the spiceflow Vite plugin detects Vitest (`process.env.VITEST`), it automatically injects a `spiceflow-vitest` resolve condition that swaps the RSC runtime for a lightweight shim and strips `"use server"`/`"use client"` directives so actions become plain callable functions. No manual `resolve.conditions` needed in your vite config.

New `spiceflow/testing` export with `SpiceflowTestResponse` and `runAction`:

```ts
import { createHref } from 'spiceflow'
import { SpiceflowTestResponse, runAction } from 'spiceflow/testing'
import { app } from './main.js'
import { myAction } from './actions.js'

// Page routes return SpiceflowTestResponse with .text() for rendered HTML
const href = createHref(app)
const res = await app.handle(new Request(`http://localhost${href('/about')}`))
if (!(res instanceof SpiceflowTestResponse)) throw new Error('expected test response')
expect(res.status).toBe(200)
expect(await res.text()).toContain('About')
expect(res.loaderData).toEqual({ ... })

// Server actions can be called directly as plain functions
const result = await myAction('arg')

// Actions that use getActionRequest() need the runAction wrapper
const result = await runAction(() => requestAwareAction(), {
  request: new Request('http://localhost', {
    method: 'POST',
    headers: { authorization: 'Bearer token' },
  }),
})
```
