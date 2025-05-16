'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const compareOpenApiSchemas = require('../dist/index.js')

test('adding request query schema property value', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {}
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'query',
            schema: {
              type: 'string'
            }
          }]
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
            type: 'parameter',
            name: 'bar',
            in: 'query',
            action: 'added',
            sourceSchema: undefined,
            targetSchema: target.paths['/foo'].get.parameters[0],
            comment: 'query parameter "bar" has been added to GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('changing request header schema property value', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'integer'
            }
          }]
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'string'
            }
          }]
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
            type: 'parameter',
            name: 'bar',
            in: 'header',
            action: 'changed',
            sourceSchema: source.paths['/foo'].get.parameters[0],
            targetSchema: target.paths['/foo'].get.parameters[0],
            changes: [
              {
                keyword: 'schema',
                changes: [
                  {
                    jsonPath: '#/type',
                    source: 'integer',
                    target: 'string'
                  }
                ],
                comment: 'parameter schema has been changed'
              }
            ],
            comment: 'header parameter "bar" has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('removing request path param schema property value', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'path',
            schema: {
              type: 'string'
            }
          }]
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {}
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
            type: 'parameter',
            name: 'bar',
            in: 'path',
            action: 'deleted',
            sourceSchema: source.paths['/foo'].get.parameters[0],
            targetSchema: undefined,
            comment: 'path parameter "bar" has been deleted from GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('making parameter required should count as a breaking change', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'integer'
            }
          }]
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'integer'
            },
            required: true
          }]
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
            type: 'parameter',
            name: 'bar',
            in: 'header',
            action: 'changed',
            sourceSchema: source.paths['/foo'].get.parameters[0],
            targetSchema: target.paths['/foo'].get.parameters[0],
            changes: [
              {
                keyword: 'required',
                source: undefined,
                target: true,
                comment: 'parameter has been made required'
              }
            ],
            comment: 'header parameter "bar" has been changed in GET "/foo" route'
          }
        ]
      }
    ]
  })
})

test('making parameter optional should not count as a breaking change', () => {
  const source = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'integer'
            },
            required: true
          }]
        }
      }
    }
  }

  const target = {
    openapi: '1.0.0',
    paths: {
      '/foo': {
        get: {
          parameters: [{
            name: 'bar',
            in: 'header',
            schema: {
              type: 'integer'
            },
            required: false
          }]
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
      }
    ],
    addedRoutes: [],
    deletedRoutes: [],
    changedRoutes: []
  })
})
