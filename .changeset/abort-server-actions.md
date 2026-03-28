---
'spiceflow': minor
---

Add `getActionAbortController` (client) and `getActionRequest` (server) for full server action abort support.

**Client side** — `getActionAbortController` from `spiceflow/react` returns the `AbortController` for the most recent in-flight call to a server action. Call `.abort()` to cancel the fetch.

```tsx
import { getActionAbortController } from 'spiceflow/react'
import { myAction } from './actions'

myAction(args)
getActionAbortController(myAction)?.abort()
```

When aborted, the action's fetch throws a `DOMException` with `name: "AbortError"`. With `useActionState`, catch it inside the action wrapper to return an error state instead of crashing the error boundary.

**Server side** — `getActionRequest` from `spiceflow` returns the `Request` for the currently executing server action via `AsyncLocalStorage`. The request's `signal` is aborted when the client disconnects (works reliably with HTTP/2; in HTTP/1.1 dev mode, detection depends on the connection being closed).

```ts
"use server"
import { getActionRequest } from 'spiceflow'

export async function myAction() {
  const request = getActionRequest()
  await fetch('https://api.example.com/slow', { signal: request.signal })
}
```
