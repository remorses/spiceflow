export const ERROR_CODE = Symbol('SpiceflowErrorCode')
export type ERROR_CODE = typeof ERROR_CODE

export const SPICEFLOW_RESPONSE = Symbol('SpiceflowResponse')
export type SPICEFLOW_RESPONSE = typeof SPICEFLOW_RESPONSE

export class ValidationError extends Error {
  code = 'VALIDATION'
  status = 422
}
