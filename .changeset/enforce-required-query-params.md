---
'spiceflow': minor
---

Enforce required query parameters at compile time across all typed APIs.

Routes with required query fields (non-optional in the Zod schema) now produce type errors when called without providing those fields. This applies to `app.href()`, `router.href()`, `Link`, `router.push()`, `router.replace()`, and `createSpiceflowFetch()`.

```ts
const app = new Spiceflow().page({
  path: '/search',
  query: z.object({ q: z.string(), page: z.number().optional() }),
  handler: async ({ query }) => `Results for ${query.q}`,
})

app.href('/search')                  // type error: missing required { q }
app.href('/search', { q: 'hello' })  // ok: page is optional

router.push('/search')               // type error: use router.href()
router.push(router.href('/search', { q: 'hello' }))  // ok

// Link rejects bare string hrefs for required-query paths
<Link href="/search" />                                    // type error
<Link href={router.href('/search', { q: 'hello' })} />    // ok
```

Resolved dynamic paths like `/users/123` also enforce required query when the matching pattern (`/users/:id`) declares one.

Page routes skip query validation at runtime so missing query params render the page instead of showing a 422 error. API routes (`.get`, `.post`, etc.) still return 422 for invalid query.
