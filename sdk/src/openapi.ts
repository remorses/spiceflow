import { OpenAPIV3 } from 'openapi-types'
import fs from 'fs'
import fastJsonStableStringify from 'fast-json-stable-stringify'

interface SchemaLocation {
  schema: OpenAPIV3.SchemaObject
  path: string
  method?: string
  type: 'parameter' | 'requestBody' | 'response'
  contentType?: string
  responseCode?: string
  // Add reference to the object that contains the schema
  schemaContainer: {
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  }
}


export function cleanupOpenApi(
  obj: any,
  maxLength: number = 400,
  path: string[] = [],
  removedPaths: string[] = []
): any {
  if (obj === null || typeof obj !== 'object') {
    // Check if string is too long
    if (typeof obj === 'string' && obj.length > maxLength) {
      removedPaths.push(path.join('.'))
      return undefined
    }
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    const newArray = obj
      .map((item, index) =>
        cleanupOpenApi(item, maxLength, [...path, index.toString()], removedPaths)
      )
      .filter((x) => x !== undefined)
    return newArray.length > 0 ? newArray : undefined
  }

  // Handle objects
  const newObj: any = {}
  let hasValidProps = false

  for (const [key, value] of Object.entries(obj)) {
    const cleaned = cleanupOpenApi(value, maxLength, [...path, key], removedPaths)
    if (cleaned !== undefined) {
      newObj[key] = cleaned
      hasValidProps = true
    }
  }

  return hasValidProps ? newObj : undefined
}



export function getSubSchemas(
  schemas: SchemaLocation[],
  maxDepth: number = 5,
): SchemaLocation[] {
  const result: SchemaLocation[] = []
  const visited = new Set<string>()

  function processSchema(
    schema: OpenAPIV3.SchemaObject,
    location: SchemaLocation,
    depth: number,
  ) {
    if (depth >= maxDepth) return

    // Generate unique key for schema to avoid cycles
    const schemaKey = fastJsonStableStringify(schema)
    if (visited.has(schemaKey)) return
    visited.add(schemaKey)

    result.push(location)

    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if ('type' in propSchema) {
          processSchema(
            propSchema,
            {
              ...location,
              path: `${location.path}/properties/${propName}`,
              schema: propSchema,
              schemaContainer: { schema: propSchema },
            },
            depth + 1,
          )
        }
      }
    }

    if (schema.type === 'array' && schema.items) {
      if (!('$ref' in schema.items)) {
        processSchema(
          schema.items,
          {
            ...location,
            path: `${location.path}/items`,
            schema: schema.items,
            schemaContainer: { schema: schema.items },
          },
          depth + 1,
        )
      }
    }

    // Handle allOf, anyOf, oneOf
    ;['allOf', 'anyOf', 'oneOf'].forEach((combiner) => {
      if (schema[combiner as keyof OpenAPIV3.SchemaObject]) {
        const schemas = schema[
          combiner as keyof OpenAPIV3.SchemaObject
        ] as OpenAPIV3.SchemaObject[]
        schemas.forEach((subSchema, index) => {
          if ('type' in subSchema) {
            processSchema(
              subSchema,
              {
                ...location,
                path: `${location.path}/${combiner}/${index}`,
                schema: subSchema,
                schemaContainer: { schema: subSchema },
              },
              depth + 1,
            )
          }
        })
      }
    })

    // Handle additionalProperties
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      if (!('$ref' in schema.additionalProperties)) {
        processSchema(
          schema.additionalProperties,
          {
            ...location,
            path: `${location.path}/additionalProperties`,
            schema: schema.additionalProperties,
            schemaContainer: { schema: schema.additionalProperties },
          },
          depth + 1,
        )
      }
    }
  }

  schemas.forEach((location) => {
    processSchema(location.schema, location, 0)
  })

  return result
}

function getAllSchemas(openapi: OpenAPIV3.Document): SchemaLocation[] {
  const schemas: SchemaLocation[] = []

  if (!openapi.paths) {
    return schemas
  }

  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    if (!pathItem || Array.isArray(pathItem)) {
      continue
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        Array.isArray(operation)
      ) {
        continue
      }

      const op = operation as OpenAPIV3.OperationObject

      // Get request body schemas
      if (op.requestBody && !Array.isArray(op.requestBody)) {
        const requestBody = op.requestBody as OpenAPIV3.RequestBodyObject
        if (requestBody.content) {
          for (const [contentType, mediaType] of Object.entries(
            requestBody.content,
          )) {
            if (mediaType.schema && !('$ref' in mediaType.schema)) {
              schemas.push({
                schema: mediaType.schema,
                path,
                method,
                type: 'requestBody',
                contentType,
                schemaContainer: mediaType as any,
              })
            }
          }
        }
      }

      // Get response schemas
      if (op.responses) {
        for (const [responseCode, response] of Object.entries(op.responses)) {
          if (response && 'content' in response) {
            const responseObj = response as OpenAPIV3.ResponseObject
            if (responseObj.content) {
              for (const [contentType, mediaType] of Object.entries(
                responseObj.content,
              )) {
                if (mediaType.schema && !('$ref' in mediaType.schema)) {
                  schemas.push({
                    schema: mediaType.schema,
                    path,
                    method,
                    type: 'response',
                    contentType,
                    responseCode,
                    schemaContainer: mediaType as any,
                  })
                }
              }
            }
          }
        }
      }

      // Get parameter schemas
      if (op.parameters) {
        for (const param of op.parameters) {
          if (!Array.isArray(param) && 'schema' in param) {
            const paramObj = param as OpenAPIV3.ParameterObject
            if (paramObj.schema && !('$ref' in paramObj.schema)) {
              schemas.push({
                schema: paramObj.schema,
                path,
                method,
                type: 'parameter',
                schemaContainer: paramObj as any,
              })
            }
          }
        }
      }
    }
  }

  return schemas
}

export function deduplicateSchemas(
  openapi: OpenAPIV3.Document,
  getSchemaName: (schema: OpenAPIV3.SchemaObject, index: number) => string = (
    _,
    i,
  ) => `Schema${i + 1}`,
) {
  // Initialize components.schemas if they don't exist
  if (!openapi.components) {
    openapi.components = {}
  }
  if (!openapi.components.schemas) {
    openapi.components.schemas = {}
  }

  const schemasTopLevel = getAllSchemas(openapi)
  const skip = new Set<OpenAPIV3.NonArraySchemaObjectType>([
    'number',
    'string',
    'boolean',
    'integer',
  ])
  const schemas = getSubSchemas(schemasTopLevel).filter((x) => {
    const schema = x.schema

    return schema.enum || !skip.has(schema.type as any)
  })

  const schemaHashes = new Map<
    string,
    {
      name: string
      count: number
      schema: OpenAPIV3.SchemaObject
    }
  >()

  // First pass - hash all schemas and count duplicates
  for (const { schema } of schemas) {
    const hash = fastJsonStableStringify(schema)
    const existing = schemaHashes.get(hash)
    if (existing) {
      existing.count++
    } else {
      schemaHashes.set(hash, {
        name: getSchemaName(schema, schemaHashes.size),
        count: 1,
        schema,
      })
    }
  }

  console.log(
    `Found schemas to deduplicate:`,
    [...schemaHashes.values()].filter((x) => x.count > 1).length,
  )
  // Second pass - replace duplicates with refs
  for (const [hash, { name, count, schema }] of schemaHashes) {
    if (count > 1) {
      // Add schema to components
      openapi.components!.schemas![name] = schema
      const ref = { $ref: `#/components/schemas/${name}` }

      // Replace all matching schemas with ref
      for (const location of schemas) {
        if (fastJsonStableStringify(location.schema) !== hash) {
          continue
        }

        // Simply update the schema reference in the container
        location.schemaContainer.schema = ref
      }
    }
  }

  return { openapi, schemas, schemasTopLevel }
}
