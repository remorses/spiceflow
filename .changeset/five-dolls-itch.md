---
'spiceflow': minor
---

Merge `safePath` path params and query params into a single flat object argument. Previously path params and query params were separate positional arguments, requiring an awkward `undefined` hole when you only needed query params. Now both are passed in one object — path param keys are identified from the route pattern (`:param` segments and `*`) and substituted into the URL, while remaining keys become query string parameters.

```ts
// before
app.safePath('/users/:id', { id: '42' }, { fields: 'name' })
app.safePath('/search', undefined, { q: 'hello', page: 1 })

// after
app.safePath('/users/:id', { id: '42', fields: 'name' })
app.safePath('/search', { q: 'hello', page: 1 })
```

The same change applies to both the `app.safePath()` method and the standalone `createSafePath()` function.
