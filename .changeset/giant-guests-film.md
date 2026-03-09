---
'spiceflow': minor
---

Change `createSpiceflowFetch` to return `Error | Data` union instead of `{ data, error }` object. Use `instanceof Error` to check for errors with Go-style early returns, and TypeScript automatically narrows the type to the success data on the happy path. On error, the returned `SpiceflowFetchError` has `status`, `value` (parsed error body), and `response` (raw Response) properties.

```ts
const user = await f('/users/:id', { params: { id: '123' } })
if (user instanceof Error) return user
console.log(user.id) // TypeScript knows this is the success type
```
