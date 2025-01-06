import { describe, expect, it } from 'vitest'
import { getOpenApiDiffPrompt } from './diff'
import { OpenAPIV3 } from 'openapi-types'

describe('getOpenApiDiffPrompt', () => {
  it('should detect changes in request and response schemas', () => {
    const previousSchema: OpenAPIV3.Document = {
      openapi: '3.1.3',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          description: '',
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      age: { type: 'number' },
                    },
                    required: ['name'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: '',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const newSchema: OpenAPIV3.Document = {
      openapi: '3.1.3',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/users': {
          description: 'Create a new user',
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      age: { type: 'number' },
                      email: { type: 'string' }, // Added field
                    },
                    required: ['name', 'email'], // Changed required
                  },
                },
              },
            },
            responses: {
              '200': {
                description: '',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        createdAt: { type: 'string' }, // Added field
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }

    const diffPrompt = getOpenApiDiffPrompt({
      previousOpenApiSchema: previousSchema,
      openApiSchema: newSchema,
    })

    expect(diffPrompt).toMatchInlineSnapshot(`
      "<changedRoutes>
      <route type="changed" method="POST" path="/users">
        <comment>requestBody changed: request body for "application/json" media type has been changed in POST "/users" route</comment>
        <diff>
          {
          "schema": {
            "properties": {
              "age": {
                "type": "number"
              },
      +       "email": {
      +         "type": "string"
      +       },
              "name": {
                "type": "string"
              }
            },
            "required": [
              "name",
      +       "email"
            ],
            "type": "object"
          }
        }
        </diff>
      </route>

      <route type="changed" method="POST" path="/users">
        <comment>responseBody changed: response body for "200" status code and "application/json" media type has been changed in POST "/users" route</comment>
        <diff>
          {
          "schema": {
            "properties": {
      +       "createdAt": {
      +         "type": "string"
      +       },
              "id": {
                "type": "string"
              },
              "name": {
                "type": "string"
              }
            },
            "type": "object"
          }
        }
        </diff>
      </route>
      </changedRoutes>

      <addedRoutes>
      None
      </addedRoutes>

      <deletedRoutes>
      None 
      </deletedRoutes>"
    `)
  })

  it('should format added routes', () => {
    expect(
      getOpenApiDiffPrompt({
        previousOpenApiSchema: {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {},
        },
        openApiSchema: {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                responses: {
                  '200': {
                    description: 'Successful response',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ).toMatchInlineSnapshot(`
      "<changedRoutes>
      None
      </changedRoutes>

      <addedRoutes>
      <route type="added" method="GET" path="/test">
      <comment>Added new route</comment>
      <diff>
      + "/test": {
      +   "get": {
      +     "responses": {
      +       "200": {
      +         "description": "Successful response",
      +         "content": {
      +           "application/json": {
      +             "schema": {
      +               "type": "object",
      +               "properties": {
      +                 "id": {
      +                   "type": "string"
      +                 }
      +               }
      +             }
      +           }
      +         }
      +       }
      +     }
      +   }
      + }
      </diff>
      </route>
      </addedRoutes>

      <deletedRoutes>
      None 
      </deletedRoutes>"
    `)
  })

  it('should format deleted routes', () => {
    expect(
      getOpenApiDiffPrompt({
        previousOpenApiSchema: {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/test': {
              get: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          age: { type: 'number' }
                        },
                        required: ['name']
                      }
                    }
                  }
                },
                responses: {
                  '200': {
                    description: 'Successful response',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        openApiSchema: {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {},
        },
      }),
    ).toMatchInlineSnapshot(`
      "<changedRoutes>
      None
      </changedRoutes>

      <addedRoutes>
      None
      </addedRoutes>

      <deletedRoutes>
      <route type="deleted" method="GET" path="/test">
      <comment>Deleted route</comment>
      <diff>
      - "/test": {
      -   "get": {
      -     "requestBody": {
      -       "content": {
      -         "application/json": {
      -           "schema": {
      -             "type": "object",
      -             "properties": {
      -               "name": {
      -                 "type": "string"
      -               },
      -               "age": {
      -                 "type": "number"
      -               }
      -             },
      -             "required": [
      -               "name"
      -             ]
      -           }
      -         }
      -       }
      -     },
      -     "responses": {
      -       "200": {
      -         "description": "Successful response",
      -         "content": {
      -           "application/json": {
      -             "schema": {
      -               "type": "object",
      -               "properties": {
      -                 "id": {
      -                   "type": "string"
      -                 }
      -               }
      -             }
      -           }
      -         }
      -       }
      -     }
      -   }
      - }
      </diff>
      </route> 
      </deletedRoutes>"
    `)
  })
})
