'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('should not count summery and description properties', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'target',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/bar': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/baz': {
        summary: 'target',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'source',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/bar': {
        description: 'source',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/baz': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      }
    }
  }

  const diff = compareOpenApiSchemas(source, target)
  assert.deepStrictEqual(diff, {
    isEqual: true,
    sameRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get
      },
      {
        method: 'get',
        path: '/bar',
        sourceSchema: source.paths['/bar'].get,
        targetSchema: target.paths['/bar'].get
      },
      {
        method: 'get',
        path: '/baz',
        sourceSchema: source.paths['/baz'].get,
        targetSchema: target.paths['/baz'].get
      }
    ],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: []
  })
})

test('should not count summery and description properties', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'target',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/bar': {
        summary: 'target',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        description: 'source',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
              }
            }
          }
        }
      },
      '/baz': {
        description: 'source',
        get: {
          responses: {
            200: {
              content: {
                'application/json': {}
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
    sameRoutes: [
      {
        method: 'get',
        path: '/foo',
        sourceSchema: source.paths['/foo'].get,
        targetSchema: target.paths['/foo'].get
      }
    ],
    addedRoutes: [
      {
        method: 'get',
        path: '/baz',
        targetSchema: target.paths['/baz'].get
      }
    ],
    deletedRoutes: [
      {
        method: 'get',
        path: '/bar',
        sourceSchema: source.paths['/bar'].get
      }
    ],
    changedRoutes: []
  })
})
