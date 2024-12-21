import { expect, test } from 'vitest'
import { Spiceflow } from './spiceflow.js'
import { openapi } from './openapi.js'
import { z } from 'zod'

test('openapi response', async () => {
  const app = await new Spiceflow()
    .use(
      openapi({
        info: {
          title: 'Spiceflow Docs',
          version: '0.0.0',
        },
      }),
    )
    .use(
      new Spiceflow({ basePath: '/one' }).get(
        '/ids/:id',
        ({ params }) => {
          if (Math.random() < 0.5) {
            // TODO add a way to set status

            return {
              message: 'sdf',
            }
          }
          return params.id
        },
        {
          response: {
            200: z.string(),
            404: z.object({
              message: z.string(),
            }),
          },
        },
      ),
    )
    .patch(
      '/addBody',
      async (c) => {
        let body = await c.request.json()
        return body
      },
      {
        body: z.object({
          name: z.string(),
        }),
        response: z.object({
          name: z.string().optional(),
        }),
      },
    )

    .get(
      '/queryParams',
      async (c) => {
        const query = c.query
        return query
      },
      {
        query: z.object({
          name: z.string(),
        }),
        response: z.object({
          name: z.string().optional(),
        }),
      },
    )
    .post(
      '/queryParams',
      async (c) => {
        const query = c.query
        return query
      },
      {
        detail: {
          description: 'This is a post',
          operationId: 'postQueryParamsXXX',
        },
        body: z.object({
          name: z.string(),
        }),
        response: z.object({
          name: z.string().optional(),
        }),
      },
    )
    .get(
      '/stream',
      async function* () {
        for (let i = 0; i < 3; i++) {
          yield { count: i }
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      },
      {
        detail: {
          description: 'This is a stream',
        },
        // response: z.object({
        //   count: z.number(),
        // }),
      },
    )
    .get(
      '/streamWithSchema',
      async function* () {
        for (let i = 0; i < 3; i++) {
          yield { count: i }
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      },
      {
        detail: {
          description: 'This is a stream with schema',
        },
        response: z.object({
          count: z.number(),
        }),
      },
    )
    .post(
      '/formWithSchemaForm',
      () => {
        const formData = new FormData()
        formData.append('name', 'test')
        formData.append('age', '25')
        return new Response(formData, {
          headers: {
            'content-type': 'multipart/form-data',
          },
        })
      },
      {
        detail: {
          description: 'This returns form data with schema',
        },
        response: z.object({
          name: z.string(),
          age: z.string(),
        }),
        type: 'multipart/form-data',
      },
    )
    .use(
      new Spiceflow({ basePath: '/two' }).get(
        '/ids/:id',
        ({ params }) => params.id,
        {
          params: z.object({
            id: z.string(),
          }),
        },
      ),
    )
  const openapiSchema = await app
    .handle(new Request('http://localhost/openapi'))
    .then((x) => x.json())
  expect(openapiSchema).toMatchInlineSnapshot(`
    {
      "components": {
        "schemas": {},
      },
      "info": {
        "description": "Development documentation",
        "title": "Spiceflow Docs",
        "version": "0.0.0",
      },
      "openapi": "3.1.3",
      "paths": {
        "/addBody": {
          "patch": {
            "parameters": [],
            "requestBody": {
              "content": {
                "application/json": {
                  "schema": {
                    "additionalProperties": false,
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
              },
              "required": true,
            },
            "responses": {
              "200": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "name": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
        "/formWithSchemaForm": {
          "post": {
            "description": "This returns form data with schema",
            "responses": {
              "200": {
                "content": {
                  "multipart/form-data": {
                    "schema": {
                      "properties": {
                        "age": {
                          "type": "string",
                        },
                        "name": {
                          "type": "string",
                        },
                      },
                      "required": [
                        "name",
                        "age",
                      ],
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
        "/one/ids/{id}": {
          "get": {
            "parameters": [
              {
                "in": "path",
                "name": "id",
                "required": true,
                "schema": {
                  "type": "string",
                },
              },
            ],
            "responses": {
              "200": {
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "",
              },
              "404": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "message": {
                          "type": "string",
                        },
                      },
                      "required": [
                        "message",
                      ],
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
        "/openapi": {
          "get": {
            "responses": {
              "200": {
                "content": {
                  "*/*": {
                    "schema": {},
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
        "/queryParams": {
          "get": {
            "parameters": [
              {
                "in": "query",
                "name": "name",
                "required": true,
                "schema": {
                  "type": "string",
                },
              },
            ],
            "responses": {
              "200": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "name": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
          "post": {
            "description": "This is a post",
            "operationId": "postQueryParamsXXX",
            "parameters": [],
            "requestBody": {
              "content": {
                "application/json": {
                  "schema": {
                    "additionalProperties": false,
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
              },
              "required": true,
            },
            "responses": {
              "200": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "name": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
        "/stream": {
          "get": {
            "description": "This is a stream",
            "responses": {
              "200": {
                "content": {
                  "*/*": {
                    "schema": {},
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
            "x-fern-streaming": {
              "format": "sse",
            },
          },
        },
        "/streamWithSchema": {
          "get": {
            "description": "This is a stream with schema",
            "responses": {
              "200": {
                "content": {
                  "application/json": {
                    "schema": {
                      "properties": {
                        "count": {
                          "type": "number",
                        },
                      },
                      "required": [
                        "count",
                      ],
                      "type": "object",
                    },
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
            "x-fern-streaming": {
              "format": "sse",
            },
          },
        },
        "/two/ids/{id}": {
          "get": {
            "parameters": [
              {
                "in": "path",
                "name": "id",
                "required": true,
                "schema": {
                  "type": "string",
                },
              },
            ],
            "responses": {
              "200": {
                "content": {
                  "*/*": {
                    "schema": {},
                  },
                },
                "description": "",
              },
              "500": {
                "content": {
                  "text/plain": {
                    "schema": {
                      "type": "string",
                    },
                  },
                },
                "description": "Internal Server Error",
              },
              "default": {
                "content": {
                  "text/plain": {
                    "schema": {},
                  },
                },
                "description": "",
              },
            },
          },
        },
      },
    }
  `)
})
