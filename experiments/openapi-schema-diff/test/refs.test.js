'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('modifying routes schema through ref', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar: {
          type: 'object',
          properties: {
            bar: {
              type: 'integer'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar: {
          type: 'object',
          properties: {
            bar: {
              type: 'string'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseBody',
            action: 'changed',
            statusCode: '200',
            mediaType: 'application/json',
            sourceSchema: source.paths['/foo'].get.responses['200'].content['application/json'],
            targetSchema: target.paths['/foo'].get.responses['200'].content['application/json'],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/properties/bar/type',
                    source: 'integer',
                    target: 'string'
                  }
                ],
                comment: 'response body schema has been changed'
              }
            ],
            comment: 'response body for "200" status code and "application/json" media type has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('different $ref property values', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar1: {
          type: 'object',
          properties: {
            bar: {
              type: 'integer'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar1'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar2: {
          type: 'object',
          properties: {
            bar: {
              type: 'string'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar2'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseBody',
            action: 'changed',
            statusCode: '200',
            mediaType: 'application/json',
            sourceSchema: source.paths['/foo'].get.responses['200'].content['application/json'],
            targetSchema: target.paths['/foo'].get.responses['200'].content['application/json'],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/$ref',
                    source: '#/components/schemas/Bar1',
                    target: '#/components/schemas/Bar2'
                  }
                ],
                comment: 'response body schema has been changed'
              }
            ],
            comment: 'response body for "200" status code and "application/json" media type has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('compare two equal schemas with circular refs', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar: {
          type: 'object',
          properties: {
            bar: {
              type: 'integer'
            },
            self: {
              $ref: '#/components/schemas/Bar'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = JSON.parse(JSON.stringify(source))

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: true,
    sameRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get
      }
    ],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: []
  })
})

test('compare two different schemas with circular refs', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar: {
          type: 'object',
          properties: {
            bar: {
              type: 'integer'
            },
            self: {
              $ref: '#/components/schemas/Bar'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar: {
          type: 'object',
          properties: {
            bar: {
              type: 'string'
            },
            self: {
              $ref: '#/components/schemas/Bar'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseBody',
            action: 'changed',
            statusCode: '200',
            mediaType: 'application/json',
            sourceSchema: source.paths['/foo'].get.responses['200'].content['application/json'],
            targetSchema: target.paths['/foo'].get.responses['200'].content['application/json'],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/properties/bar/type',
                    source: 'integer',
                    target: 'string'
                  }
                ],
                comment: 'response body schema has been changed'
              }
            ],
            comment: 'response body for "200" status code and "application/json" media type has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('compare two equal schemas with cross circular refs', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar1: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar2'
            },
            bar: {
              type: 'integer'
            }
          }
        },
        Bar2: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar1'
            },
            bar: {
              type: 'integer'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar1'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = JSON.parse(JSON.stringify(source))

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: true,
    sameRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get
      }
    ],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: []
  })
})

test('compare two different schemas with cross circular refs', () => {
  const source = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar1: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar2'
            },
            bar: {
              type: 'integer'
            }
          }
        },
        Bar2: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar1'
            },
            bar: {
              type: 'integer'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar1'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    components: {
      schemas: {
        Bar1: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar2'
            },
            bar: {
              type: 'string'
            }
          }
        },
        Bar2: {
          type: 'object',
          properties: {
            self: {
              $ref: '#/components/schemas/Bar1'
            },
            bar: {
              type: 'integer'
            }
          }
        }
      }
    },
    paths: {
      '/foo': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Bar1'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: false,
    sameRoutes: [],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get,
        changes: [
          {
            type: 'responseBody',
            action: 'changed',
            statusCode: '200',
            mediaType: 'application/json',
            sourceSchema: source.paths['/foo'].get.responses['200'].content['application/json'],
            targetSchema: target.paths['/foo'].get.responses['200'].content['application/json'],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/properties/bar/type',
                    source: 'integer',
                    target: 'string'
                  }
                ],
                comment: 'response body schema has been changed'
              }
            ],
            comment: 'response body for "200" status code and "application/json" media type has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})
