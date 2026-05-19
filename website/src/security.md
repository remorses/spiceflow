---
title: Security Guide
description: CSRF, authentication, and authorization patterns.
icon: shield
---

# Security Guide

CSRF protection (the Origin header check on server actions) blocks cross-site form submissions. It does **not** authenticate the caller. Any HTTP client can call a server action or API route directly. Treat every `"use server"` function and every `.get()`/`.post()` route as a public endpoint.

This guide assumes better-auth for authentication and Drizzle for database queries.

## Authentication

### Server actions

`getActionRequest()` gives you the action's own request — use it to resolve the session. Extract a shared `requireSession()` helper so every action is one line:

```ts
// src/auth-helpers.ts
import { getActionRequest } from 'spiceflow'
import { auth } from './auth.js'

export async function requireSession() {
  const request = getActionRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('unauthorized')
  return session
}
```

```ts
// src/actions.ts
'use server'
import { ulid } from 'ulid'
import { requireSession } from './auth-helpers.js'

export async function deleteProject(orgId: string, projectId: string) {
  const session = await requireSession()
  // ... authorization check, then mutation
}
```

Call `requireSession()` at the top of every action that reads or mutates user data — before any database call.

### API routes

API routes don't use loaders. Read `state.session` directly, resolved by the session middleware:

```ts
.state('session', null as AuthSession)
.use(async ({ request, state }) => {
  state.session = await auth.api.getSession({ headers: request.headers })
})

.get('/api/projects', ({ state }) => {
  if (!state.session) return new Response('Unauthorized', { status: 401 })
  // ...
})
```

### Pages and loaders

Loaders and pages can redirect unauthenticated users to the login page. A layout guard protects all nested pages at once:

```ts
.layout('/app/*', async ({ loaderData, children }) => {
  if (!loaderData.session) throw redirect('/login')
  return <AppLayout>{children}</AppLayout>
})
```

## Authorization

Authentication proves *who* the caller is. Authorization proves *they own the resource*. Always check both.

### Owner check

Fetch the resource only if it belongs to the current user. A single query covers both lookup and ownership:

```ts
export async function deleteProject(orgId: string, projectId: string) {
  const session = await requireSession()

  // Only returns the project if the user owns the parent org
  const project = await db.query.project.findFirst({
    where: {
      id: projectId,
      orgId,
      organization: { ownerId: session.user.id },
    },
  })
  if (!project) throw new Error('not found or forbidden')

  await db.delete(schema.project).where(orm.eq(schema.project.id, projectId))
}
```

### Membership check

For multi-tenant apps where many users can belong to an org, check membership before accessing any resource in that org:

```ts
export async function createProject(orgId: string, name: string) {
  const session = await requireSession()

  // Verify user is a member of the org
  const membership = await db.query.orgMember.findFirst({
    where: { orgId, userId: session.user.id },
  })
  if (!membership) throw new Error('forbidden')

  const id = ulid()
  await db.insert(schema.project).values({ id, name, orgId, createdAt: new Date() })
  return { id, name, orgId }
}
```

Do the same check in loaders before returning org data:

```ts
.loader('/orgs/:orgId/dashboard', async ({ params, state }) => {
  if (!state.session) return { org: null, projects: [] }

  const membership = await db.query.orgMember.findFirst({
    where: { orgId: params.orgId, userId: state.session.user.id },
  })
  if (!membership) return { org: null, projects: [] }

  const projects = await db.query.project.findMany({
    where: { orgId: params.orgId },
  })
  return { org: { id: membership.orgId }, projects }
})
```

## Input Validation

Validate all user-supplied input before using it — before any database call. Use `parseFormData` for forms and Zod for JSON:

```ts
import { z } from 'zod'
import { parseFormData } from 'spiceflow'

const createProjectSchema = z.object({
  orgId: z.string().min(1),
  name: z.string().min(1).max(100),
})

export async function createProject(formData: FormData) {
  const session = await requireSession()
  const { orgId, name } = parseFormData(createProjectSchema, formData)
  // orgId and name are now validated strings — safe to use in queries
}
```

For API routes with a request body schema, spiceflow validates automatically:

```ts
.route({
  method: 'POST',
  path: '/api/projects',
  request: z.object({ orgId: z.string().min(1), name: z.string().min(1).max(100) }),
  async handler({ body, state }) {
    if (!state.session) return new Response('Unauthorized', { status: 401 })
    // body is validated and typed
  },
})
```

## Data Isolation

Never query a list without scoping it to the current user. Always filter by the user's identity or membership:

```ts
// Scoped to the current user's orgs only
const orgs = await db.query.organization.findMany({
  where: { ownerId: session.user.id },
})

// With membership table — only orgs the user belongs to
const orgs = await db.query.organization.findMany({
  where: { members: { userId: session.user.id } },
})
```

## Testing Security

Tests should explicitly verify that unauthenticated requests and cross-user access are rejected. See [Testing with Vitest](./testing.md) for the full testing setup, especially the "Testing with Authentication" and "Testing with better-auth" sections.

Two patterns to always cover:

**Unauthenticated access** — verify the action or route rejects requests without a session:

```ts
test('unauthenticated user cannot access protected route', async () => {
  const anon = createSpiceflowFetch(app)
  const result = await anon('/api/projects')
  expect(result).toBeInstanceOf(Error)
})
```

**Cross-user access** — verify user B cannot read or mutate user A's resources:

```ts
test('user cannot delete another users project', async () => {
  // Set up Alice with an org and project
  const aliceToken = await signupAndGetToken('alice@example.com')
  const alice = createSpiceflowFetch(app, { headers: { authorization: `Bearer ${aliceToken}` } })
  const org = await runAction(() => createOrg('Alice Org'), { request: authedRequest(aliceToken) })
  const project = await runAction(() => createProject(org.id, 'Alice Project'), { request: authedRequest(aliceToken) })

  // Bob tries to delete Alice's project
  const bobToken = await signupAndGetToken('bob@example.com')
  const error = await runAction(
    () => deleteProject(org.id, project.id),
    { request: authedRequest(bobToken) },
  ).catch((e) => e)

  expect(error).toBeInstanceOf(Error)
  expect(error.message).toMatch(/forbidden|not found/)
})
```

Use `runAction` with a custom request to pass auth tokens to actions that call `getActionRequest()`. See [example-better-auth tests](https://github.com/remorses/spiceflow/blob/main/example-better-auth/src/main.test.ts) for a complete working example covering these patterns.
