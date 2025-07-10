---
'spiceflow': patch
---

Add path parameter to onError handler and validate error status codes. The onError handler now receives the request path where the error occurred, making it easier to debug and log errors with context. Additionally, error status codes are now validated to ensure they are valid HTTP status codes (100-599), defaulting to 500 for invalid values. The error status resolution now also supports `statusCode` as a fallback when `status` is not present.

```typescript
// Before
app.onError(({ error, request }) => {
  console.log('Error occurred', error)
  return new Response('Error', { status: 500 })
})

// After
app.onError(({ error, request, path }) => {
  console.log(`Error occurred at ${path}`, error)
  return new Response('Error', { status: 500 })
})
```