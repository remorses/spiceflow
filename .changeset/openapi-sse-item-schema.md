---
'spiceflow': minor
---

OpenAPI documents are now version `3.2.0`, and async generator (SSE) routes describe their events with `itemSchema`. A route's `response` schema is now the schema of **one yielded item**, written as JSON `data` of `event: message`:

```ts
new Spiceflow().route({
  method: 'GET',
  path: '/progress',
  response: z.object({ progress: z.number() }),
  async *handler() {
    yield { progress: 1 }
  },
})
```

```yaml
text/event-stream:
  itemSchema:
    properties:
      event: { type: string, enum: [message, error, done] }
      data: { type: string, contentMediaType: application/json, contentSchema: { ... } }
```

Before, SSE routes with a `response` schema were documented as a single `application/json` body, and SSE routes without one as `*/*`.
