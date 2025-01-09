import { describe, expect, it } from 'vitest'
import { getOpenApiDiffPrompt } from './diff'
import { OpenAPIV3 } from 'openapi-types'

import { extractMarkdownSnippets } from './sdk'

describe('extractMarkdownSnippets', () => {
  it('should extract code blocks from markdown', () => {
    const markdown = `
Some text before

\`\`\`typescript
const x = 1;
const y = 2;
\`\`\`

Text between code blocks

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

Some text after
`

    expect(extractMarkdownSnippets(markdown).length).toBe(2)

    expect(extractMarkdownSnippets(markdown)).toMatchInlineSnapshot(`
      [
        "const x = 1;
      const y = 2;",
        "function test() {
        return true;
      }",
      ]
    `)
  })

  it('should return full text when no code blocks present', () => {
    const markdown = 'Just plain text\nwith multiple lines'
    expect(extractMarkdownSnippets(markdown)).toMatchInlineSnapshot(`
      [
        "Just plain text
      with multiple lines",
      ]
    `)
  })
  it('should extract single code block with surrounding text', () => {
    const markdown = `
Some text before the code block

\`\`\`typescript
const singleExample = "test";
console.log(singleExample);
\`\`\`

And some text after the block
`
    expect(extractMarkdownSnippets(markdown).length).toBe(1)

    expect(extractMarkdownSnippets(markdown)).toMatchInlineSnapshot(`
      [
        "const singleExample = "test";
      console.log(singleExample);",
      ]
    `)
  })

  it('should handle empty code blocks', () => {
    const markdown = '```\n```'
    expect(extractMarkdownSnippets(markdown)).toMatchInlineSnapshot(`[]`)
  })
})

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

    expect(diffPrompt.fullPrompt).toMatchInlineSnapshot(`
      "<changedRoutes>
      This route should be updated in the SDK as it was updated from the OpenAPI schema.
        <route type="changed" method="POST" path="/users">
        <comment>requestBody changed: request body for "application/json" media type has been changed in POST "/users" route</comment>
        <diff>
          {
          "openapi": "3.1.3",
          "info": {
            "title": "Test API",
            "version": "1.0.0"
          },
          "paths": {
            "/users": {
              "post": {
                "requestBody": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "object",
                        "properties": {
                          "name": {
                            "type": "string"
                          },
                          "age": {
                            "type": "number"
                          },
      +                   "email": {
      +                     "type": "string"
      +                   }
                        },
                        "required": [
                          "name",
      +                   "email"
                        ]
                      }
                    }
                  }
                },
                "responses": {
                  "200": {
                    "description": "",
                    "content": {
                      "application/json": {
                        "schema": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
      +                     "createdAt": {
      +                       "type": "string"
      +                     }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        </diff>
        </route>

      This route should be updated in the SDK as it was updated from the OpenAPI schema.
        <route type="changed" method="POST" path="/users">
        <comment>responseBody changed: response body for "200" status code and "application/json" media type has been changed in POST "/users" route</comment>
        <diff>
          {
          "openapi": "3.1.3",
          "info": {
            "title": "Test API",
            "version": "1.0.0"
          },
          "paths": {
            "/users": {
              "post": {
                "requestBody": {
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "object",
                        "properties": {
                          "name": {
                            "type": "string"
                          },
                          "age": {
                            "type": "number"
                          },
      +                   "email": {
      +                     "type": "string"
      +                   }
                        },
                        "required": [
                          "name",
      +                   "email"
                        ]
                      }
                    }
                  }
                },
                "responses": {
                  "200": {
                    "description": "",
                    "content": {
                      "application/json": {
                        "schema": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
      +                     "createdAt": {
      +                       "type": "string"
      +                     }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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
      }).fullPrompt,
    ).toMatchInlineSnapshot(`
      "<changedRoutes>
      None
      </changedRoutes>

      <addedRoutes>
      This route should be added to the SDK as it was added to the OpenAPI schema.
      <route type="added" method="GET" path="/test">
      <comment>Added new route</comment>
      <diff>
      {
        "openapi": "3.0.0",
        "info": {
          "title": "Test API",
          "version": "1.0.0"
        },
        "paths": {
          "/test": {
            "get": {
              "responses": {
                "200": {
                  "description": "Successful response",
                  "content": {
                    "application/json": {
                      "schema": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      </diff>
      </route>
      </addedRoutes>

      <deletedRoutes>
      None 
      </deletedRoutes>"
    `)
  })

  it('should format added routes with schema refs', () => {
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
                          $ref: '#/components/schemas/TestResponse',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              TestResponse: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  data: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }).fullPrompt,
    ).toMatchInlineSnapshot(`
      "<changedRoutes>
      None
      </changedRoutes>

      <addedRoutes>
      This route should be added to the SDK as it was added to the OpenAPI schema.
      <route type="added" method="GET" path="/test">
      <comment>Added new route</comment>
      <diff>
      {
        "openapi": "3.0.0",
        "info": {
          "title": "Test API",
          "version": "1.0.0"
        },
        "paths": {
          "/test": {
            "get": {
              "responses": {
                "200": {
                  "description": "Successful response",
                  "content": {
                    "application/json": {
                      "schema": {
                        "$ref": "#/components/schemas/TestResponse"
                      }
                    }
                  }
                }
              }
            }
          },
          "components": {
            "schemas": {
              "TestResponse": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string"
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "components": {
          "schemas": {
            "TestResponse": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "data": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
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
                          age: { type: 'number' },
                        },
                        required: ['name'],
                      },
                    },
                  },
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
      }).fullPrompt,
    ).toMatchInlineSnapshot(`
      "<changedRoutes>
      None
      </changedRoutes>

      <addedRoutes>
      None
      </addedRoutes>

      <deletedRoutes>
      This route should be removed from the SDK as it was deleted from the OpenAPI schema.
      <route type="deleted" method="GET" path="/test">
      <comment>Deleted route</comment>
      <diff>
      - {
      -   "openapi": "3.0.0",
      -   "info": {
      -     "title": "Test API",
      -     "version": "1.0.0"
      -   },
      -   "paths": {
      -     "/test": {
      -       "get": {
      -         "requestBody": {
      -           "content": {
      -             "application/json": {
      -               "schema": {
      -                 "type": "object",
      -                 "properties": {
      -                   "name": {
      -                     "type": "string"
      -                   },
      -                   "age": {
      -                     "type": "number"
      -                   }
      -                 },
      -                 "required": [
      -                   "name"
      -                 ]
      -               }
      -             }
      -           }
      -         },
      -         "responses": {
      -           "200": {
      -             "description": "Successful response",
      -             "content": {
      -               "application/json": {
      -                 "schema": {
      -                   "type": "object",
      -                   "properties": {
      -                     "id": {
      -                       "type": "string"
      -                     }
      -                   }
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
