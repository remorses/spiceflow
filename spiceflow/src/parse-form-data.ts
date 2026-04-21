// Parse and validate FormData against a Standard Schema (Zod, Valibot, ArkType).
// Handles string→number/boolean coercion and uses getAll() for array fields.

import type { StandardSchemaV1 } from './standard-schema.js'
import { ValidationError } from './error.js'

interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
}

const jsonSchemaCache = new WeakMap<object, Record<string, unknown> | null>()

function extractJsonSchema(
  schema: unknown,
): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined
  const cached = jsonSchemaCache.get(schema)
  if (cached !== undefined) return cached ?? undefined
  const result = extractJsonSchemaUncached(schema)
  jsonSchemaCache.set(schema, result ?? null)
  return result
}

function extractJsonSchemaUncached(
  schema: unknown,
): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined
  const std = Reflect.get(schema, '~standard')
  if (!std || typeof std !== 'object') return undefined
  const converter = Reflect.get(std, 'jsonSchema')
  if (!converter || typeof converter !== 'object') return undefined
  const input = Reflect.get(converter, 'input')
  if (typeof input !== 'function') return undefined
  try {
    return input({ target: 'draft-2020-12' })
  } catch {
    try {
      return input({ target: 'draft-07' })
    } catch {
      return undefined
    }
  }
}

function resolveNullableInnerSchema(schema: JsonSchema): JsonSchema {
  const variants = schema.anyOf || schema.oneOf
  if (!variants) return schema
  const nonNull = variants.filter((v) => v.type !== 'null')
  if (nonNull.length === 1) return nonNull[0]
  return schema
}

function schemaExpectsArray(schema: JsonSchema): boolean {
  if (schema.type === 'array') return true
  if (!schema.type && schema.items) return true
  return false
}

function coerceSingleValue(value: unknown, schema: JsonSchema): unknown {
  if (typeof value !== 'string') return value
  const targetType = Array.isArray(schema.type) ? schema.type[0] : schema.type
  switch (targetType) {
    case 'number':
    case 'integer': {
      if (value === '') return value
      const num = +value
      if (!Number.isFinite(num)) return value
      if (targetType === 'integer' && num % 1 !== 0) return value
      return num
    }
    case 'boolean': {
      if (value === 'true') return true
      if (value === 'false') return false
      return value
    }
    default:
      return value
  }
}

function formDataToObject(
  formData: FormData,
  properties: Record<string, JsonSchema>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, propSchema] of Object.entries(properties)) {
    const resolved = resolveNullableInnerSchema(propSchema)
    if (schemaExpectsArray(resolved)) {
      const values = formData.getAll(key)
      const items = resolved.items
      result[key] = items
        ? values.map((v) => coerceSingleValue(v, items))
        : values
    } else {
      const value = formData.get(key)
      if (value === null) continue
      result[key] = coerceSingleValue(value, resolved)
    }
  }
  return result
}

/**
 * Parse and validate FormData against a Standard Schema.
 * Coerces string values to numbers/booleans based on the schema types.
 * Uses `formData.getAll()` for fields declared as arrays in the schema.
 *
 * Works with Zod, Valibot, ArkType, or any Standard Schema v1 library.
 */
export function parseFormData<T extends StandardSchemaV1>(
  schema: T,
  formData: FormData,
): StandardSchemaV1.InferOutput<T> {
  const jsonSchema = extractJsonSchema(schema)
  const properties = jsonSchema?.properties as
    | Record<string, JsonSchema>
    | undefined

  const raw = properties
    ? formDataToObject(formData, properties)
    : Object.fromEntries(formData)

  const result = (schema as StandardSchemaV1)['~standard'].validate(raw)
  if ('then' in (result as any)) {
    throw new Error(
      'parseFormData does not support async schemas. Use parseFormDataAsync instead.',
    )
  }
  const syncResult = result as StandardSchemaV1.Result<unknown>
  if (syncResult.issues) {
    const messages = syncResult.issues.map((i) => i.message).join(', ')
    throw new ValidationError(messages)
  }
  return syncResult.value as StandardSchemaV1.InferOutput<T>
}

/**
 * Async version of parseFormData for schemas with async validation (e.g. async refinements).
 */
export async function parseFormDataAsync<T extends StandardSchemaV1>(
  schema: T,
  formData: FormData,
): Promise<StandardSchemaV1.InferOutput<T>> {
  const jsonSchema = extractJsonSchema(schema)
  const properties = jsonSchema?.properties as
    | Record<string, JsonSchema>
    | undefined

  const raw = properties
    ? formDataToObject(formData, properties)
    : Object.fromEntries(formData)

  const result = await (schema as StandardSchemaV1)['~standard'].validate(raw)
  if (result.issues) {
    const messages = result.issues.map((i) => i.message).join(', ')
    throw new ValidationError(messages)
  }
  return result.value as StandardSchemaV1.InferOutput<T>
}
