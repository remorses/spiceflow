import { ValidationError } from './error.ts'
import type { StandardSchemaV1 } from '@standard-schema/spec'

export type ValidationFunction = (
  value: unknown,
) => StandardSchemaV1.Result<any> | Promise<StandardSchemaV1.Result<any>>

export async function runValidation(value: any, validate?: ValidationFunction) {
  if (!validate) return value

  let result = validate(value)
  if (result instanceof Promise) {
    result = await result
  }

  if (result.issues && result.issues.length > 0) {
    const errorMessages = result.issues
      .map((issue) => {
        let pathString = ''
        if (issue.path && issue.path.length > 0) {
          pathString = issue.path.join('.') + ': '
        }
        return pathString + issue.message
      })
      .join('\\n')
    throw new ValidationError(errorMessages || 'Validation failed')
  }
  if ('value' in result) {
    return result.value
  }
  return value
}
