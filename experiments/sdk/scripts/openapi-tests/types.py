from dataclasses import dataclass
from typing import Optional, List


@dataclass
class BaseError:
  detail: str
  """A human-readable explanation specific to this occurrence of the problem."""

  instance: str
  """A URI reference that identifies the specific occurrence of the problem."""

  request_id: str
  """A unique id for this request. Please always provide this to support."""

  status: int
  """HTTP status code"""

  title: str
  """A short, human-readable summary of the problem type. This value should not change between
  occurrences of the error.
  """
  type: str
  """A URI reference to human-readable documentation for the error."""


@dataclass
class Encrypted:
  encrypted: str
  key_id: str


@dataclass
class Item:
  duration: int
  """The duration in milliseconds for the rate limit window."""

  identifier: str
  """The identifier for the rate limit."""

  limit: int
  """The maximum number of requests allowed."""

  cost: Optional[int]
  """The cost of the request."""


@dataclass
class Lease:
  """Reserve an amount of tokens with the option to commit and update later."""

  cost: int
  """How much to lease."""

  timeout: int
  """The time in milliseconds when the lease will expire. If you do not commit the lease by
  this time, it will be commited as is.
  """


@dataclass
class SingleRatelimitResponse:
  current: int
  """The current number of requests made in the current window."""

  limit: int
  """The maximum number of requests allowed."""

  remaining: int
  """The number of requests remaining in the current window."""

  reset: int
  """The time in milliseconds when the rate limit will reset."""

  success: bool
  """Whether the request passed the ratelimit. If false, the request must be blocked."""


@dataclass
class V0EventsResponseBody:
  quarantined_rows: int
  """The number of rows that were quarantined"""

  successful_rows: int
  """The number of rows that were successfully processed"""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1DecryptRequestBody:
  encrypted: str
  """The encrypted base64 string."""

  keyring: str
  """The keyring to use for encryption."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1DecryptResponseBody:
  plaintext: str
  """The plaintext value."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1EncryptBulkRequestBody:
  data: List[str]
  keyring: str
  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1EncryptBulkResponseBody:
  encrypted: List[Encrypted]
  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1EncryptRequestBody:
  data: str
  """The data to encrypt."""

  keyring: str
  """The keyring to use for encryption."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1EncryptResponseBody:
  encrypted: str
  """The encrypted data as base64 encoded string."""

  key_id: str
  """The ID of the key used for encryption."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1LivenessResponseBody:
  message: str
  """Whether we're alive or not"""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1RatelimitCommitLeaseRequestBody:
  cost: int
  """The actual cost of the request."""

  lease: str
  """The lease you received from the ratelimit response."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1RatelimitMultiRatelimitRequestBody:
  ratelimits: List[Item]
  """The rate limits to check."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1RatelimitMultiRatelimitResponseBody:
  ratelimits: List[SingleRatelimitResponse]
  """The rate limits that were checked."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class V1RatelimitRatelimitRequestBody:
  duration: int
  """The duration in milliseconds for the rate limit window."""

  identifier: str
  """The identifier for the rate limit."""

  limit: int
  """The maximum number of requests allowed."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""

  cost: Optional[int]
  """The cost of the request. Defaults to 1 if not provided."""

  lease: Optional[Lease]
  """Reserve an amount of tokens with the option to commit and update later."""


@dataclass
class V1RatelimitRatelimitResponseBody:
  current: int
  """The current number of requests made in the current window."""

  lease: str
  """The lease to use when committing the request."""

  limit: int
  """The maximum number of requests allowed."""

  remaining: int
  """The number of requests remaining in the current window."""

  reset: int
  """The time in milliseconds when the rate limit will reset."""

  success: bool
  """Whether the request passed the ratelimit. If false, the request must be blocked."""

  schema: Optional[str]
  """A URL to the JSON Schema for this object."""


@dataclass
class AllExportedType:
  location: str
  """Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id'"""

  message: str
  """Error message text"""

  fix: Optional[str]
  """A human-readable message describing how to fix the error."""


@dataclass
class ValidationError:
  detail: str
  """A human-readable explanation specific to this occurrence of the problem."""

  errors: List[AllExportedType]
  """Optional list of individual error details"""

  instance: str
  """A URI reference that identifies the specific occurrence of the problem."""

  request_id: str
  """A unique id for this request. Please always provide this to support."""

  status: int
  """HTTP status code"""

  title: str
  """A short, human-readable summary of the problem type. This value should not change between
  occurrences of the error.
  """
  type: str
  """A URI reference to human-readable documentation for the error."""


@dataclass
class AllExportedTypes:
  base_error: BaseError
  encrypted: Encrypted
  item: Item
  lease: Lease
  single_ratelimit_response: SingleRatelimitResponse
  v0_events_request_body: str
  v0_events_response_body: V0EventsResponseBody
  v1_decrypt_request_body: V1DecryptRequestBody
  v1_decrypt_response_body: V1DecryptResponseBody
  v1_encrypt_bulk_request_body: V1EncryptBulkRequestBody
  v1_encrypt_bulk_response_body: V1EncryptBulkResponseBody
  v1_encrypt_request_body: V1EncryptRequestBody
  v1_encrypt_response_body: V1EncryptResponseBody
  v1_liveness_response_body: V1LivenessResponseBody
  v1_ratelimit_commit_lease_request_body: V1RatelimitCommitLeaseRequestBody
  v1_ratelimit_multi_ratelimit_request_body: V1RatelimitMultiRatelimitRequestBody
  v1_ratelimit_multi_ratelimit_response_body: V1RatelimitMultiRatelimitResponseBody
  v1_ratelimit_ratelimit_request_body: V1RatelimitRatelimitRequestBody
  v1_ratelimit_ratelimit_response_body: V1RatelimitRatelimitResponseBody
  validation_error: ValidationError
  validation_error_detail: AllExportedType
