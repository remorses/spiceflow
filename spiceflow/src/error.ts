export const ERROR_CODE = Symbol('SpiceflowErrorCode')
export type ERROR_CODE = typeof ERROR_CODE

export const SPICEFLOW_RESPONSE = Symbol('SpiceflowResponse')
export type SPICEFLOW_RESPONSE = typeof SPICEFLOW_RESPONSE

// Phantom brands for type-safe Response.json() wrapper.
// These symbols are never used at runtime — they exist only in the type
// system so TypedResponse carries the data type and status code through
// handler return → _ComposeSpiceflowResponse → fetch client.
export declare const RESPONSE_DATA: unique symbol
declare const RESPONSE_STATUS: unique symbol

export type TypedResponse<T = unknown, S extends number = 200> = Response & {
  readonly [RESPONSE_DATA]: T
  readonly [RESPONSE_STATUS]: S
}

/**
 * Type-safe wrapper around Response.json().
 * Returns a real Response at runtime, but at the type level it carries
 * the data type T and status code S so the fetch client gets full
 * type safety for each status code.
 */
export function json<T, S extends number = 200>(
  data: T,
  init?: ResponseInit & { status?: S },
): TypedResponse<T, S> {
  return Response.json(data, init) as any
}

export class ValidationError extends Error {
  code = 'VALIDATION'
  status = 422
}
