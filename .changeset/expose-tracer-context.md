---
'spiceflow': minor
---

Expose `span` and `tracer` on handler context for all route types (API routes, pages, layouts, loaders, middleware). Users can now add custom attributes, record caught exceptions, and create child spans directly from their handlers without any conditional checks. When no tracer is configured, both fields use no-op implementations that V8 inlines away. Also exports `withSpan`, `noopSpan`, and `noopTracer` as public utilities.

```ts
// add attributes to the current handler span
.get('/api/users/:id', ({ params, span }) => {
  const user = db.findUser(params.id)
  span.setAttribute('user.plan', user.plan)
  return user
})

// record a caught exception without re-throwing
.post('/api/webhook', async ({ request, span }) => {
  const body = await request.json()
  try {
    await processWebhook(body)
  } catch (err) {
    span.recordException(err)
  }
  return { ok: true }
})

// create child spans for DB calls or external APIs
.get('/api/data', async ({ tracer, params }) => {
  return tracer.startActiveSpan('db.query', async (dbSpan) => {
    const data = await db.query(params.id)
    dbSpan.setAttribute('db.rows', data.length)
    dbSpan.end()
    return data
  })
})
```
