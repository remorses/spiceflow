---
'spiceflow': minor
---

**BREAKING CHANGE**: Make route method field optional with `*` as default. Routes without an explicit `method` field now listen on all HTTP methods instead of requiring a method to be specified. This change simplifies route creation for catch-all handlers.

**Before:**
```typescript
app.route({
  method: 'GET', // required
  path: '/api/users',
  handler: () => 'users'
})
```

**After:**
```typescript
// Method is now optional, defaults to '*' (all methods)
app.route({
  path: '/api/users', 
  handler: () => 'users'
})

// Explicit method still works
app.route({
  method: 'GET',
  path: '/api/users',
  handler: () => 'users'
})
```
