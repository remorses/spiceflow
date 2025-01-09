import { OpenAPIV3 } from 'openapi-types'
import fastJsonStableStringify from 'fast-json-stable-stringify'

/**
 * Deduplicates schemas in an OpenAPI document by moving duplicate schemas to components
 * and replacing them with refs
 */
export function deduplicateSchemas(openapi: OpenAPIV3.Document): OpenAPIV3.Document {
  // Initialize components.schemas if it doesn't exist
  if (!openapi.components) {
    openapi.components = {}
  }
  if (!openapi.components.schemas) {
    openapi.components.schemas = {}
  }

  // Map to track unique schemas
  const schemaMap = new Map<string, string>() // stringified schema -> ref name

  // Helper to process a schema and return a ref if duplicate
  const processSchema = (schema: any): any => {
    if (!schema || typeof schema !== 'object') return schema
    
    // Skip if already a ref
    if (schema.$ref) return schema

    // Deep clone to avoid modifying original while processing nested schemas
    const schemaCopy = JSON.parse(JSON.stringify(schema))

    // Process nested schemas first
    if (schemaCopy.properties) {
      Object.keys(schemaCopy.properties).forEach(prop => {
        schemaCopy.properties[prop] = processSchema(schemaCopy.properties[prop])
      })
    }
    if (schemaCopy.items) {
      schemaCopy.items = processSchema(schemaCopy.items)
    }
    if (schemaCopy.additionalProperties && typeof schemaCopy.additionalProperties === 'object') {
      schemaCopy.additionalProperties = processSchema(schemaCopy.additionalProperties)
    }

    // Check if this schema has been seen before
    const schemaString = fastJsonStableStringify(schemaCopy)
    if (schemaMap.has(schemaString)) {
      return { $ref: `#/components/schemas/${schemaMap.get(schemaString)}` }
    }

    // If complex enough, add to components
    if (Object.keys(schemaCopy).length > 2) {
      const name = `Schema${schemaMap.size + 1}`
      schemaMap.set(schemaString, name)
      openapi.components!.schemas![name] = schemaCopy
      return { $ref: `#/components/schemas/${name}` }
    }

    return schema
  }

  // Process all paths
  if (openapi.paths) {
    for (const [pathKey, pathItem] of Object.entries(openapi.paths)) {
      if (!pathItem) continue

      // Handle path parameters
      if (Array.isArray(pathItem)) {
        continue // Skip if pathItem is an array (ServerObject[])
      }

      // Process each operation
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue

        const op = operation as OpenAPIV3.OperationObject

        // Process request body schemas
        if (op.requestBody && !Array.isArray(op.requestBody)) {
          const requestBody = op.requestBody as OpenAPIV3.RequestBodyObject
          if (requestBody.content) {
            for (const [_, mediaType] of Object.entries(requestBody.content)) {
              if (mediaType.schema) {
                mediaType.schema = processSchema(mediaType.schema)
              }
            }
          }
        }

        // Process response schemas
        if (op.responses) {
          for (const [_, response] of Object.entries(op.responses)) {
            if (response && 'content' in response) {
              const responseObj = response as OpenAPIV3.ResponseObject
              if (responseObj.content) {
                for (const [_, mediaType] of Object.entries(responseObj.content)) {
                  if (mediaType.schema) {
                    mediaType.schema = processSchema(mediaType.schema)
                  }
                }
              }
            }
          }
        }

        // Process parameter schemas
        if (op.parameters) {
          for (const param of op.parameters) {
            if (!Array.isArray(param) && 'schema' in param) {
              const paramObj = param as OpenAPIV3.ParameterObject
              if (paramObj.schema) {
                paramObj.schema = processSchema(paramObj.schema)
              }
            }
          }
        }
      }
    }
  }

  return openapi
}

