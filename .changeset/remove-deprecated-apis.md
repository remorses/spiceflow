---
'spiceflow': patch
---

Remove deprecated APIs to simplify the codebase and public surface area.

**Removed exports:**

- `createSpiceflowClient` from `spiceflow/client`. Use `createSpiceflowFetch` instead, which provides the same type safety with a simpler fetch-like API that returns `Error | Data` directly.
- `spiceflowPlugin` named export from `spiceflow/vite`. Use the default export instead: `import spiceflow from 'spiceflow/vite'`.
- `app.handleNode(req, res)` method. Use `app.handleForNode(req, res)` instead.
- `app.listenForNode(port)` method. Use `app.listen(port)` instead.
- `InputSchema.body` property. Use `request` instead when defining request body schemas.

**Migration for `createSpiceflowClient` → `createSpiceflowFetch`:**

```ts
// before
const client = createSpiceflowClient(app)
const { data, error } = await client.users.get()

// after
const f = createSpiceflowFetch(app)
const result = await f('/users')
if (result instanceof Error) {
  // handle error
}
```

**Migration for route schema `body` → `request`:**

```ts
// before
app.post('/users', handler, { body: z.object({ name: z.string() }) })

// after
app.post('/users', handler, { request: z.object({ name: z.string() }) })
```
