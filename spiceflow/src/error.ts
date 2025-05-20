export const ERROR_CODE = Symbol('SpiceflowErrorCode')
export type ERROR_CODE = typeof ERROR_CODE

export const SPICEFLOW_RESPONSE = Symbol('SpiceflowResponse')
export type SPICEFLOW_RESPONSE = typeof SPICEFLOW_RESPONSE

export class ValidationError extends Error {
  code = 'VALIDATION'
  status = 422
}

export class ParseError extends Error {
  code = 'PARSE'
  status = 400
}

export class InternalServerError extends Error {
  code = 'INTERNAL_SERVER_ERROR'
  status = 500
}
