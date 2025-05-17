export interface AllExportedTypes {
  baseError: BaseError
  encrypted: Encrypted
  item: Item
  lease: Lease
  singleRatelimitResponse: SingleRatelimitResponse
  v0EventsRequestBody: string
  v0EventsResponseBody: V0EventsResponseBody
  v1DecryptRequestBody: V1DecryptRequestBody
  v1DecryptResponseBody: V1DecryptResponseBody
  v1EncryptBulkRequestBody: V1EncryptBulkRequestBody
  v1EncryptBulkResponseBody: V1EncryptBulkResponseBody
  v1EncryptRequestBody: V1EncryptRequestBody
  v1EncryptResponseBody: V1EncryptResponseBody
  v1LivenessResponseBody: V1LivenessResponseBody
  v1RatelimitCommitLeaseRequestBody: V1RatelimitCommitLeaseRequestBody
  v1RatelimitMultiRatelimitRequestBody: V1RatelimitMultiRatelimitRequestBody
  v1RatelimitMultiRatelimitResponseBody: V1RatelimitMultiRatelimitResponseBody
  v1RatelimitRatelimitRequestBody: V1RatelimitRatelimitRequestBody
  v1RatelimitRatelimitResponseBody: V1RatelimitRatelimitResponseBody
  validationError: ValidationError
  validationErrorDetail: AllExportedType
  [property: string]: any
}

export interface BaseError {
  /**
   * A human-readable explanation specific to this occurrence of the problem.
   */
  detail: string
  /**
   * A URI reference that identifies the specific occurrence of the problem.
   */
  instance: string
  /**
   * A unique id for this request. Please always provide this to support.
   */
  requestID: string
  /**
   * HTTP status code
   */
  status: number
  /**
   * A short, human-readable summary of the problem type. This value should not change between
   * occurrences of the error.
   */
  title: string
  /**
   * A URI reference to human-readable documentation for the error.
   */
  type: string
  [property: string]: any
}

export interface Encrypted {
  encrypted: string
  keyID: string
}

export interface Item {
  /**
   * The cost of the request.
   */
  cost?: number
  /**
   * The duration in milliseconds for the rate limit window.
   */
  duration: number
  /**
   * The identifier for the rate limit.
   */
  identifier: string
  /**
   * The maximum number of requests allowed.
   */
  limit: number
}

/**
 * Reserve an amount of tokens with the option to commit and update later.
 */
export interface Lease {
  /**
   * How much to lease.
   */
  cost: number
  /**
   * The time in milliseconds when the lease will expire. If you do not commit the lease by
   * this time, it will be commited as is.
   */
  timeout: number
}

export interface SingleRatelimitResponse {
  /**
   * The current number of requests made in the current window.
   */
  current: number
  /**
   * The maximum number of requests allowed.
   */
  limit: number
  /**
   * The number of requests remaining in the current window.
   */
  remaining: number
  /**
   * The time in milliseconds when the rate limit will reset.
   */
  reset: number
  /**
   * Whether the request passed the ratelimit. If false, the request must be blocked.
   */
  success: boolean
}

export interface V0EventsResponseBody {
  /**
   * The number of rows that were quarantined
   */
  quarantinedRows: number
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
  /**
   * The number of rows that were successfully processed
   */
  successfulRows: number
  [property: string]: any
}

export interface V1DecryptRequestBody {
  /**
   * The encrypted base64 string.
   */
  encrypted: string
  /**
   * The keyring to use for encryption.
   */
  keyring: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1DecryptResponseBody {
  /**
   * The plaintext value.
   */
  plaintext: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1EncryptBulkRequestBody {
  data: string[]
  keyring: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1EncryptBulkResponseBody {
  encrypted: Encrypted[]
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1EncryptRequestBody {
  /**
   * The data to encrypt.
   */
  data: string
  /**
   * The keyring to use for encryption.
   */
  keyring: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1EncryptResponseBody {
  /**
   * The encrypted data as base64 encoded string.
   */
  encrypted: string
  /**
   * The ID of the key used for encryption.
   */
  keyID: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1LivenessResponseBody {
  /**
   * Whether we're alive or not
   */
  message: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1RatelimitCommitLeaseRequestBody {
  /**
   * The actual cost of the request.
   */
  cost: number
  /**
   * The lease you received from the ratelimit response.
   */
  lease: string
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1RatelimitMultiRatelimitRequestBody {
  /**
   * The rate limits to check.
   */
  ratelimits: Item[]
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1RatelimitMultiRatelimitResponseBody {
  /**
   * The rate limits that were checked.
   */
  ratelimits: SingleRatelimitResponse[]
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1RatelimitRatelimitRequestBody {
  /**
   * The cost of the request. Defaults to 1 if not provided.
   */
  cost?: number
  /**
   * The duration in milliseconds for the rate limit window.
   */
  duration: number
  /**
   * The identifier for the rate limit.
   */
  identifier: string
  /**
   * Reserve an amount of tokens with the option to commit and update later.
   */
  lease?: Lease
  /**
   * The maximum number of requests allowed.
   */
  limit: number
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
}

export interface V1RatelimitRatelimitResponseBody {
  /**
   * The current number of requests made in the current window.
   */
  current: number
  /**
   * The lease to use when committing the request.
   */
  lease: string
  /**
   * The maximum number of requests allowed.
   */
  limit: number
  /**
   * The number of requests remaining in the current window.
   */
  remaining: number
  /**
   * The time in milliseconds when the rate limit will reset.
   */
  reset: number
  /**
   * A URL to the JSON Schema for this object.
   */
  schema?: string
  /**
   * Whether the request passed the ratelimit. If false, the request must be blocked.
   */
  success: boolean
}

export interface ValidationError {
  /**
   * A human-readable explanation specific to this occurrence of the problem.
   */
  detail: string
  /**
   * Optional list of individual error details
   */
  errors: AllExportedType[]
  /**
   * A URI reference that identifies the specific occurrence of the problem.
   */
  instance: string
  /**
   * A unique id for this request. Please always provide this to support.
   */
  requestID: string
  /**
   * HTTP status code
   */
  status: number
  /**
   * A short, human-readable summary of the problem type. This value should not change between
   * occurrences of the error.
   */
  title: string
  /**
   * A URI reference to human-readable documentation for the error.
   */
  type: string
}

export interface AllExportedType {
  /**
   * A human-readable message describing how to fix the error.
   */
  fix?: string
  /**
   * Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id'
   */
  location: string
  /**
   * Error message text
   */
  message: string
}
