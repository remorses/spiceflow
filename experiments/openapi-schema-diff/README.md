# openapi-schema-diff

__openapi-schema-diff__ is a javascript library that compares two OpenAPI schemas and finds breaking changes.

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [compare(sourceSchema, targetSchema)](#comparesourceSchema-targetSchema)
- [License](#license)

<a name="installation"></a>

## Installation

```bash
npm install openapi-schema-diff
```

<a name="usage"></a>

## Usage

```javascript
const compareOpenApiSchemas = require('openapi-schema-diff')

const sourceSchema = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  paths: {
    '/pets': {
      get: {
        summary: 'Returns all pets',
        responses: {
          200: {
            description: 'A list of pets.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      age: {
                        type: 'integer'
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
}

const targetSchema = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  paths: {
    '/pets': {
      get: {
        summary: 'Returns all pets',
        responses: {
          200: {
            description: 'A list of pets.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      age: {
                        type: 'integer'
                      },
                      breed: {
                        type: 'string'
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
}

const differences = compareOpenApiSchemas(sourceSchema, targetSchema)
assert.deepEqual(differences, {
  isEqual: false,
  sameRoutes: [],
  addedRoutes: [],
  deletedRoutes: [],
  changedRoutes: [
    {
      method: 'get',
      path: '/pets',
      sourceSchema: sourceSchema.paths['/pets'].get,
      targetSchema: targetSchema.paths['/pets'].get,
      changes: [
        {
          type: 'responseBody',
          statusCode: '200',
          mediaType: 'application/json',
          action: 'changed',
          sourceSchema: sourceSchema.paths['/pets'].get.responses['200'].content['application/json'],
          targetSchema: targetSchema.paths['/pets'].get.responses['200'].content['application/json'],
          changes: [
            {
              keyword: 'schema',
              changes: [
                {
                  jsonPath: '#/items/properties/breed',
                  source: undefined,
                  target: {
                    type: 'string'
                  }
                }
              ],
              comment: 'response header schema has been changed'
            }
          ],
          comment: 'response body for "200" status code and "application/json" media type has been changed in GET "/pets" route'
        }
      ]
    }
  ]
})
```

<a name="api"></a>

## API

<a name="compare-openapi-schemas"></a>

#### compare(sourceSchema, targetSchema)

Compares two OpenAPI schemas and returns and finds breaking changes. Source and target schemas must have the same OpenAPI major version.

- `sourceSchema` __\<object\>__ - source OpenAPI schema.
- `targetSchema` __\<object\>__ - target OpenAPI schema.
- __Returns__ - an object with schema differences.
  - `isEqual` __\<boolean\>__ - `true` if target schema does not have breaking changes, `false` otherwise.
  - `sameRoutes` __\<array\>__ - an array of routes that are present in both schemas and do not have breaking changes. See [same route](#same-route-object).
  - `addedRoutes` __\<array\>__ - an array of routes that are present in target schema but not in source schema. See [added route](#added-route-object).
  - `deletedRoutes` __\<array\>__ - an array of routes that are present in source schema but not in target schema. See [deleted route](#deleted-route-object).
  - `changedRoutes` __\<array\>__ - an array of routes that are present in both schemas and have breaking changes. See [changed route](#changed-route-object).

##### Same route object

- `method` __\<string\>__ - HTTP method name of the route.
- `path` __\<string\>__ - path of the route.
- `sourceSchema` __\<object\>__ - source OpenAPI schema of the route.
- `targetSchema` __\<object\>__ - target OpenAPI schema of the route.

##### Added route object

- `method` __\<string\>__ - HTTP method name of the route.
- `path` __\<string\>__ - path of the route.
- `targetSchema` __\<object\>__ - target OpenAPI schema of the route.

##### Deleted route object

- `method` __\<string\>__ - HTTP method name of the route.
- `path` __\<string\>__ - path of the route.
- `sourceSchema` __\<object\>__ - source OpenAPI schema of the route.

##### Changed route object

- `method` __\<string\>__ - HTTP method name of the route.
- `path` __\<string\>__ - path of the route.
- `sourceSchema` __\<object\>__ - source OpenAPI schema of the route.
- `targetSchema` __\<object\>__ - target OpenAPI schema of the route.
- `changes` __\<array\>__ - a list of route components (header, querystring, body, ...) that have breaking changes. See [change object](#route-change-object)

##### Route change object

- `type` __\<string\>__ - type of the component. One of `parameter`, `requestBody`, `responseBody`, `responseHeader`.
- `action` __\<string\>__ - action that was performed on the component. One of `added`, `deleted`, `changed`.
- `sourceSchema` __\<object\>__ - source OpenAPI schema of the component.
- `targetSchema` __\<object\>__ - target OpenAPI schema of the component.
- `comment` __\<string\>__ - a comment describing the change.
- `changes` __\<array\>__ - a list of changes in a component json schema. Exist only if `action` equals to `changed`. Each schema keyword has it's own change object. See [list of change objects](#list-schema-keywords-and-their-change-objects).

Each of the route components has it's own unique properties that identify it. For more details look at the component change object: [parameter](#parameter-change-object), [request body](#request-body-change-object), [response body](#response-body-change-object), [response header](#response-header-change-object).

##### Parameter change object

- `type` __\<string\>__ - type of the component. Equals to `parameter`.
- `name` __\<string\>__ - name of the parameter.
- `in` __\<string\>__ - location of the parameter. One of `query`, `header`, `path`, `cookie`.
- `schemaChanges` - a list of changes in a component json schema. See [schema change object](#schema-change-object).
- `comment` __\<string\>__ - a comment describing the change.

##### Request body change object

- `type` __\<string\>__ - type of the component. Equals to `requestBody`.
- `mediaType` __\<string\>__ - media type of the component.
- `schemaChanges` - a list of changes in a component json schema. See [schema change object](#schema-change-object).
- `comment` __\<string\>__ - a comment describing the change.

##### Response body change object

- `type` __\<string\>__ - type of the component. Equals to `responseBody`.
- `statusCode` __\<string\>__ - HTTP status code of the component.
- `mediaType` __\<string\>__ - media type of the component.
- `schemaChanges` - a list of changes in a component json schema. See [schema change object](#schema-change-object).
- `comment` __\<string\>__ - a comment describing the change.

##### Response header change object

- `type` __\<string\>__ - type of the component. Equals to `responseHeader`.
- `header` __\<string\>__ - name of the header.
- `statusCode` __\<string\>__ - HTTP status code of the component.
- `schemaChanges` - a list of changes in a component json schema. See [schema change object](#schema-change-object).
- `comment` __\<string\>__ - a comment describing the change.

#### List schema keywords and their change objects

- [schema change object](#schema-keyword-change-object)
- [required keyword change object](#required-keyword-change-object)

##### schema keyword change object

- `keyword` __\<string\>__ - keyword name. Equals to `schema`.
- `comment` __\<string\>__ - a comment describing the change.
- `changes` __\<array\>__ - a list of changes in a component json schema.
  - `jsonPath` __\<string\>__ - JSON path of the changed schema.
  - `source` __\<object\>__ - source subschema placed at the `jsonPath`.
  - `target` __\<object\>__ - target subschema placed at the `jsonPath`.

##### required keyword change object

- `keyword` __\<string\>__ - keyword name. Equals to `required`.
- `source` __\<boolean\>__ - source value of the keyword.
- `target` __\<boolean\>__ - target value of the keyword.
- `comment` __\<string\>__ - a comment describing the change.

<a name="license"></a>

## License

MIT
