---
'spiceflow': patch
---

Fix WebSocket upgrades on Cloudflare Workers. Returning a `101` response with a `webSocket` (for example a Durable Object `stub.fetch(request)`) threw `RangeError: Responses may only be constructed with status codes in the range 200 to 599`, because spiceflow rebuilt the response to add `Server-Timing`, CORS or deployment headers. These paths now keep the `webSocket`, so this works with default options:

```ts
new Spiceflow().get('/live', ({ request }) => env.ROOM.get(id).fetch(request))
```

Fixes #55
