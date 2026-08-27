// Tests OpenAPI route conversion into executable WebMCP tools.
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import { openapi } from '../openapi.ts'
import { Spiceflow } from '../spiceflow.tsx'
import { createSpiceflowFetch } from './fetch.ts'
import { createWebMcpTools, installWebMcp } from './webmcp.ts'

const app = new Spiceflow()
  .use(openapi())
  .route({
    method: 'GET',
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    query: z.object({ verbose: z.boolean().optional() }),
    detail: {
      operationId: 'get_user',
      summary: 'Get user',
      description: 'Get one user by ID.',
    },
    handler: ({ params, query }) => ({ id: params.id, verbose: query.verbose }),
  })
  .route({
    method: 'POST',
    path: '/users',
    request: z.object({ name: z.string() }),
    handler: async ({ request }) => ({ id: '1', ...(await request.json()) }),
  })
  .route({
    method: 'DELETE',
    path: '/users/:id',
    params: z.object({ id: z.string() }),
    handler: ({ params }) => ({ deleted: params.id }),
  })
  .get('/health', () => ({ ok: true }))
  .get('/failure', () => {
    throw new Response(JSON.stringify({ message: 'No access' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  })
  .onError(() => {})

const fetch = createSpiceflowFetch(app)

async function getOpenApi() {
  return app
    .handle(new Request('http://localhost/openapi'))
    .then((response) => response.json())
}

describe('createWebMcpTools', () => {
  test('installation is a no-op when WebMCP is unavailable', async () => {
    const uninstall = await installWebMcp({ fetch })
    expect(uninstall()).toBeUndefined()
  })

  test('creates tools only for routes with input by default', async () => {
    const result = createWebMcpTools({
      fetch,
      openapi: await getOpenApi(),
    })
    if (result instanceof Error) throw result

    expect(
      result.map(({ execute: _, ...tool }) => tool),
    ).toMatchInlineSnapshot(`
      [
        {
          "annotations": {
            "readOnlyHint": true,
          },
          "description": "Get one user by ID.",
          "inputSchema": {
            "properties": {
              "params": {
                "properties": {
                  "id": {
                    "type": "string",
                  },
                },
                "required": [
                  "id",
                ],
                "type": "object",
              },
              "query": {
                "properties": {
                  "verbose": {
                    "type": "boolean",
                  },
                },
                "type": "object",
              },
            },
            "required": [
              "params",
            ],
            "type": "object",
          },
          "name": "get_user",
          "title": "Get user",
        },
        {
          "description": "DELETE route for /users/:id",
          "inputSchema": {
            "properties": {
              "params": {
                "properties": {
                  "id": {
                    "type": "string",
                  },
                },
                "required": [
                  "id",
                ],
                "type": "object",
              },
            },
            "required": [
              "params",
            ],
            "type": "object",
          },
          "name": "delete_users_id",
        },
        {
          "description": "POST route for /users",
          "inputSchema": {
            "properties": {
              "body": {
                "properties": {
                  "name": {
                    "type": "string",
                  },
                },
                "required": [
                  "name",
                ],
                "type": "object",
              },
            },
            "required": [
              "body",
            ],
            "type": "object",
          },
          "name": "post_users",
        },
      ]
    `)
  })

  test('applies include before exclude and can include inputless routes', async () => {
    const openapi = await getOpenApi()
    const result = createWebMcpTools({
      fetch,
      openapi,
      include: [{ path: '/health' }, { path: '/users/:id' }],
      exclude: [{ method: 'DELETE', path: '/users/:id' }],
    })
    if (result instanceof Error) throw result

    expect(result.map((tool) => tool.name)).toEqual(['get_user', 'get_health'])

    const empty = createWebMcpTools({ fetch, openapi, include: [] })
    if (empty instanceof Error) throw empty
    expect(empty).toEqual([])
  })

  test('moves local OpenAPI schema references into WebMCP definitions', () => {
    const result = createWebMcpTools({
      fetch,
      openapi: {
        openapi: '3.1.3',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/projects': {
            post: {
              responses: {},
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ProjectInput' },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            ProjectInput: {
              type: 'object',
              properties: { name: { type: 'string' } },
              required: ['name'],
            },
          },
        },
      },
    })
    if (result instanceof Error) throw result

    expect(result[0].inputSchema).toMatchInlineSnapshot(`
      {
        "$defs": {
          "ProjectInput": {
            "properties": {
              "name": {
                "type": "string",
              },
            },
            "required": [
              "name",
            ],
            "type": "object",
          },
        },
        "properties": {
          "body": {
            "$ref": "#/$defs/ProjectInput",
          },
        },
        "type": "object",
      }
    `)
  })

  test('executes routes through the supplied fetch client', async () => {
    const result = createWebMcpTools({ fetch, openapi: await getOpenApi() })
    if (result instanceof Error) throw result

    const getUser = result.find((tool) => tool.name === 'get_user')!
    const user = await getUser.execute(
      { params: { id: '42' }, query: { verbose: true } },
      { signal: new AbortController().signal },
    )
    expect(user).toEqual({ id: '42', verbose: true })

    const createUser = result.find((tool) => tool.name === 'post_users')!
    const created = await createUser.execute(
      { body: { name: 'Alice' } },
      { signal: new AbortController().signal },
    )
    expect(created).toEqual({ id: '1', name: 'Alice' })
  })

  test('returns JSON-safe route errors', async () => {
    const result = createWebMcpTools({
      fetch,
      openapi: await getOpenApi(),
      include: [{ path: '/failure' }],
    })
    if (result instanceof Error) throw result

    const error = await result[0].execute(
      {},
      { signal: new AbortController().signal },
    )
    expect(error).toMatchInlineSnapshot(`
      {
        "error": {
          "message": "No access",
          "status": 403,
          "value": {
            "message": "No access",
          },
        },
        "ok": false,
      }
    `)
  })
})
