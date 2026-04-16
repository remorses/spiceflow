# Middleware Patterns

Advanced middleware patterns for authentication, proxying, cookies, and graceful shutdown.

## Authorization

You can handle authorization in a middleware. The example below checks if the user is logged in and uses `.state()` to track the session across handlers:

```ts
import { z } from 'zod'
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('session', null as Session | null)
  .use(async ({ request: req, state }, next) => {
    const res = new Response()

    const { session } = await getSession({ req, res })
    if (!session) {
      return
    }
    state.session = session
    const response = await next()

    const cookies = res.headers.getSetCookie()
    for (const cookie of cookies) {
      response.headers.append('Set-Cookie', cookie)
    }

    return response
  })
  .route({
    method: 'POST',
    path: '/protected',
    async handler({ state }) {
      const { session } = state
      if (!session) {
        throw new Error('Not logged in')
      }
      return { ok: true }
    },
  })
```

## Proxy

```ts
import { Spiceflow } from 'spiceflow'
import type { MiddlewareHandler } from 'spiceflow'

export const app = new Spiceflow()

function createProxyMiddleware({
  target,
  changeOrigin = false,
}): MiddlewareHandler {
  return async ({ request }) => {
    const { pathname, search } = request.parsedUrl

    const proxyReq = new Request(
      new URL(pathname + search, target),
      request,
    )

    if (changeOrigin) {
      proxyReq.headers.set('origin', new URL(target).origin || '')
    }
    console.log('proxying', proxyReq.url)
    const res = await fetch(proxyReq)

    return res
  }
}

app.use(
  createProxyMiddleware({
    target: 'https://api.openai.com',
    changeOrigin: true,
  }),
)

// or with a basePath
app.use(
  new Spiceflow({ basePath: '/v1/completions' }).use(
    createProxyMiddleware({
      target: 'https://api.openai.com',
      changeOrigin: true,
    }),
  ),
)

app.listen(3030)
```

## Non-Blocking Auth

Sometimes authentication is only required for specific routes, and you don't want to block public routes while waiting for authentication. You can use `Promise.withResolvers()` to start fetching user data in parallel, allowing public routes to respond immediately while protected routes wait for authentication to complete.

The example below demonstrates this pattern - the `/public` route responds instantly while `/protected` waits for authentication:

```ts
import { Spiceflow } from 'spiceflow'

new Spiceflow()
  .state('userId', Promise.resolve(''))
  .state('userEmail', Promise.resolve(''))
  .use(async ({ request, state }, next) => {
    const sessionKey = request.headers.get('sessionKey')
    const userIdPromise = Promise.withResolvers<string>()
    const userEmailPromise = Promise.withResolvers<string>()

    state.userId = userIdPromise.promise
    state.userEmail = userEmailPromise.promise

    async function resolveUser() {
      if (!sessionKey) {
        userIdPromise.resolve('')
        userEmailPromise.resolve('')
        return
      }
      const user = await getUser(sessionKey)
      userIdPromise.resolve(user?.id ?? '')
      userEmailPromise.resolve(user?.email ?? '')
    }

    resolveUser()
  })
  .route({
    method: 'GET',
    path: '/protected',
    async handler({ state }) {
      const userId = await state.userId
      if (!userId) throw new Error('Not authenticated')
      return { message: 'Protected data' }
    },
  })
  .route({
    method: 'GET',
    path: '/public',
    handler() {
      return { message: 'Public data' }
    },
  })

async function getUser(sessionKey: string) {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return sessionKey === 'valid'
    ? { id: '123', email: 'user@example.com' }
    : null
}
```

## Cookies

Spiceflow works with standard Request and Response objects, so you can use any cookie library like the `cookie` npm package to handle cookies.

### Set, Get, and Clear Cookies

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

export const app = new Spiceflow()
  .route({
    method: 'GET',
    path: '/set-cookie',
    handler({ request }) {
      const cookies = parse(request.headers.get('Cookie') || '')

      const response = new Response(
        JSON.stringify({
          message: 'Cookie set!',
          existingCookies: cookies,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )

      response.headers.set(
        'Set-Cookie',
        serialize('session', 'abc123', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        }),
      )

      return response
    },
  })
  .route({
    method: 'GET',
    path: '/get-cookie',
    handler({ request }) {
      const cookies = parse(request.headers.get('Cookie') || '')
      return { sessionId: cookies.session || null, allCookies: cookies }
    },
  })
  .route({
    method: 'POST',
    path: '/clear-cookie',
    handler({ request }) {
      const response = new Response(
        JSON.stringify({ message: 'Cookie cleared!' }),
        { headers: { 'Content-Type': 'application/json' } },
      )

      response.headers.set(
        'Set-Cookie',
        serialize('session', '', {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          expires: new Date(0),
          path: '/',
        }),
      )

      return response
    },
  })

app.listen(3000)
```

### Cookie-Based Auth Middleware

You can also use cookies in middleware for authentication or session handling:

```ts
import { Spiceflow } from 'spiceflow'
import { parse, serialize } from 'cookie'

export const app = new Spiceflow()
  .state('userId', null as string | null)
  .use(async ({ request, state }, next) => {
    // Parse cookies from incoming request
    const cookies = parse(request.headers.get('Cookie') || '')

    // Extract user ID from session cookie
    if (cookies.session) {
      // In a real app, you'd verify the session token
      state.userId = cookies.session
    }

    const response = await next()

    // Optionally refresh the session cookie
    if (state.userId && response) {
      response.headers.set(
        'Set-Cookie',
        serialize('session', state.userId, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        }),
      )
    }

    return response
  })
  .route({
    method: 'GET',
    path: '/profile',
    handler({ state }) {
      if (!state.userId) {
        return new Response('Unauthorized', { status: 401 })
      }

      return { userId: state.userId, message: 'Welcome back!' }
    },
  })
```

## Graceful Shutdown

The `preventProcessExitIfBusy` middleware prevents platforms like Fly.io from killing your app while processing long requests (e.g., AI payloads). Fly.io can wait up to 5 minutes for graceful shutdown.

```ts
import { Spiceflow, preventProcessExitIfBusy } from 'spiceflow'

export const app = new Spiceflow()
  .use(
    preventProcessExitIfBusy({
      maxWaitSeconds: 300, // 5 minutes max wait (default: 300)
      checkIntervalMs: 250, // Check interval (default: 250ms)
    }),
  )
  .route({
    method: 'POST',
    path: '/ai/generate',
    async handler({ request }) {
      const prompt = await request.json()
      // Long-running AI generation
      const result = await generateAIResponse(prompt)
      return result
    },
  })

app.listen(3000)
```

When receiving SIGTERM during deployment, the middleware waits for all active requests to complete before exiting. Perfect for AI workloads that may take minutes to process.
