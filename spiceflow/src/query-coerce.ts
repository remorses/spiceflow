// Query parameter coercion using Standard Schema JSON Schema.
//
// Query params are always strings from the URL. This module coerces them
// to the types declared in the schema (number, boolean, array) before
// validation runs. Uses the Standard Schema v1.1 jsonSchema converter,
// so it works with Zod, Valibot, ArkType, or any conforming library.
//
// Adapted from goke's coercion logic (goke/src/coerce.ts).

interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
}

function isJsonSchemaRecord(value: unknown): value is Record<string, JsonSchema> {
  return Boolean(value) && typeof value === 'object'
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

function schemaExpectsArray(schema: JsonSchema): boolean {
  if (schema.type === 'array') return true
  if (!schema.type && schema.items) return true
  return false
}

function resolveNullableInnerSchema(schema: JsonSchema): JsonSchema {
  // Only unwrap anyOf/oneOf when it's a nullable wrapper (exactly one non-null variant).
  // General unions like z.union([z.number(), z.string()]) are left untouched
  // so the validator decides which branch matches.
  const variants = schema.anyOf || schema.oneOf
  if (!variants) return schema
  const nonNull = variants.filter((v) => v.type !== 'null')
  if (nonNull.length === 1) return nonNull[0]
  return schema
}

function coerceValue(
  value: unknown,
  propSchema: JsonSchema,
): unknown {
  const resolved = resolveNullableInnerSchema(propSchema)

  if (schemaExpectsArray(resolved)) {
    const items = resolved.items
    if (Array.isArray(value)) {
      // Already an array (repeated keys), coerce each item
      return items ? value.map((v) => coerceSingleValue(v, items)) : value
    }
    // Single value → wrap in array, coerce the item
    if (value === undefined || value === null) return value
    return items ? [coerceSingleValue(value, items)] : [value]
  }

  if (Array.isArray(value)) {
    // Schema expects a scalar but got an array (repeated keys).
    // Leave untouched so the validator rejects the type mismatch.
    return value
  }

  return coerceSingleValue(value, resolved)
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

/**
 * Coerce raw parsed query values to match the types declared in a schema.
 * Handles string→number, string→boolean, and single-value→array coercion
 * by inspecting the schema's JSON Schema representation.
 *
 * Returns the original query unchanged if the schema doesn't support
 * JSON Schema extraction (e.g. non-Standard-Schema objects).
 */
export function coerceQueryWithSchema(
  rawQuery: Record<string, unknown>,
  schema: unknown,
): Record<string, unknown> {
  if (!schema) return rawQuery

  const jsonSchema = extractJsonSchema(schema)
  if (!jsonSchema) return rawQuery

  const properties = jsonSchema.properties
  if (!isJsonSchemaRecord(properties)) return rawQuery

  const coerced: Record<string, unknown> = { ...rawQuery }
  for (const [key, propSchema] of Object.entries(properties)) {
    if (!Object.hasOwn(coerced, key)) continue
    coerced[key] = coerceValue(coerced[key], propSchema)
  }
  return coerced
}
