openapi: 3.0.3
info:
  title: Dub.co API
  description: Dub is link management infrastructure for companies to create marketing campaigns, link sharing features, and referral programs.
  version: 0.0.1
  contact:
    name: Dub.co Support
    email: support@dub.co
    url: https://dub.co/api
  license:
    name: AGPL-3.0 license
    url: https://github.com/dubinc/dub/blob/main/LICENSE.md
servers:
  - url: https://api.dub.co
    description: Production API
paths:
  /customers:
    get:
      operationId: getCustomers
      x-speakeasy-name-override: list
      summary: Retrieve a list of customers
      description: Retrieve a list of customers for the authenticated workspace.
      tags:
        - Customers
      parameters:
        - in: query
          name: email
          description: A case-sensitive filter on the list based on the customer's `email` field. The value must be a string.
          schema:
            type: string
            description: A case-sensitive filter on the list based on the customer's `email` field. The value must be a string.
        - in: query
          name: externalId
          description: A case-sensitive filter on the list based on the customer's `externalId` field. The value must be a string.
          schema:
            type: string
            description: A case-sensitive filter on the list based on the customer's `externalId` field. The value must be a string.
        - in: query
          name: includeExpandedFields
          description: Whether to include expanded fields on the customer (`link`, `partner`, `discount`).
          schema:
            type: boolean
            description: Whether to include expanded fields on the customer (`link`, `partner`, `discount`).
      responses:
        '200':
          description: The list of customers.
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: string
                      description: The unique identifier of the customer in Dub.
                    externalId:
                      type: string
                      description: Unique identifier for the customer in the client's app.
                    name:
                      type: string
                      description: Name of the customer.
                    email:
                      type: string
                      nullable: true
                      description: Email of the customer.
                    avatar:
                      type: string
                      nullable: true
                      description: Avatar URL of the customer.
                    country:
                      type: string
                      nullable: true
                      description: Country of the customer.
                    createdAt:
                      type: string
                      description: The date the customer was created.
                    link:
                      type: object
                      nullable: true
                      properties:
                        id:
                          type: string
                          description: The unique ID of the short link.
                        domain:
                          type: string
                          description: The domain of the short link. If not provided, the primary domain for the workspace will be used (or `dub.sh` if the workspace has no domains).
                        key:
                          type: string
                          description: The short link slug. If not provided, a random 7-character slug will be generated.
                        shortLink:
                          type: string
                          format: uri
                          description: The full URL of the short link, including the https protocol (e.g. `https://dub.sh/try`).
                        programId:
                          type: string
                          nullable: true
                          description: The ID of the program the short link is associated with.
                      required:
                        - id
                        - domain
                        - key
                        - shortLink
                        - programId
                    partner:
                      type: object
                      nullable: true
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        email:
                          type: string
                        image:
                          type: string
                          nullable: true
                      required:
                        - id
                        - name
                        - email
                    discount:
                      type: object
                      nullable: true
                      properties:
                        id:
                          type: string
                        couponId:
                          type: string
                          nullable: true
                        couponTestId:
                          type: string
                          nullable: true
                        amount:
                          type: number
                        type:
                          type: string
                          enum:
                            - percentage
                            - flat
                        duration:
                          type: number
                          nullable: true
                        interval:
                          type: string
                          nullable: true
                          enum:
                            - month
                            - year
                            - null
                      required:
                        - id
                        - couponId
                        - couponTestId
                        - amount
                        - type
                        - duration
                        - interval
                  required:
                    - id
                    - externalId
                    - name
                    - createdAt
        '400':
          $ref: '#/components/responses/400'
        '401':
          $ref: '#/components/responses/401'
        '403':
          $ref: '#/components/responses/403'
        '404':
          $ref: '#/components/responses/404'
        '409':
          $ref: '#/components/responses/409'
        '410':
          $ref: '#/components/responses/410'
        '422':
          $ref: '#/components/responses/422'
        '429':
          $ref: '#/components/responses/429'
        '500':
          $ref: '#/components/responses/500'
components:
  responses:
    '400':
      description: The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).
      content:
        application/json:
          schema:
            x-speakeasy-name-override: BadRequest
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - bad_request
                    description: A short code indicating the error code returned.
                    example: bad_request
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#bad-request
                required:
                  - code
                  - message
            required:
              - error
    '401':
      description: Although the HTTP standard specifies "unauthorized", semantically this response means "unauthenticated". That is, the client must authenticate itself to get the requested response.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Unauthorized
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - unauthorized
                    description: A short code indicating the error code returned.
                    example: unauthorized
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#unauthorized
                required:
                  - code
                  - message
            required:
              - error
    '403':
      description: The client does not have access rights to the content; that is, it is unauthorized, so the server is refusing to give the requested resource. Unlike 401 Unauthorized, the client's identity is known to the server.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Forbidden
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - forbidden
                    description: A short code indicating the error code returned.
                    example: forbidden
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#forbidden
                required:
                  - code
                  - message
            required:
              - error
    '404':
      description: The server cannot find the requested resource.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: NotFound
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - not_found
                    description: A short code indicating the error code returned.
                    example: not_found
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#not-found
                required:
                  - code
                  - message
            required:
              - error
    '409':
      description: This response is sent when a request conflicts with the current state of the server.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: Conflict
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - conflict
                    description: A short code indicating the error code returned.
                    example: conflict
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#conflict
                required:
                  - code
                  - message
            required:
              - error
    '410':
      description: This response is sent when the requested content has been permanently deleted from server, with no forwarding address.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: InviteExpired
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - invite_expired
                    description: A short code indicating the error code returned.
                    example: invite_expired
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#invite-expired
                required:
                  - code
                  - message
            required:
              - error
    '422':
      description: The request was well-formed but was unable to be followed due to semantic errors.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: UnprocessableEntity
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - unprocessable_entity
                    description: A short code indicating the error code returned.
                    example: unprocessable_entity
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#unprocessable-entity
                required:
                  - code
                  - message
            required:
              - error
    '429':
      description: The user has sent too many requests in a given amount of time ("rate limiting")
      content:
        application/json:
          schema:
            x-speakeasy-name-override: RateLimitExceeded
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - rate_limit_exceeded
                    description: A short code indicating the error code returned.
                    example: rate_limit_exceeded
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#rate-limit_exceeded
                required:
                  - code
                  - message
            required:
              - error
    '500':
      description: The server has encountered a situation it does not know how to handle.
      content:
        application/json:
          schema:
            x-speakeasy-name-override: InternalServerError
            type: object
            properties:
              error:
                type: object
                properties:
                  code:
                    type: string
                    enum:
                      - internal_server_error
                    description: A short code indicating the error code returned.
                    example: internal_server_error
                  message:
                    x-speakeasy-error-message: true
                    type: string
                    description: A human readable explanation of what went wrong.
                    example: The requested resource was not found.
                  doc_url:
                    type: string
                    description: A link to our documentation with more details about this error code
                    example: https://dub.co/docs/api-reference/errors#internal-server_error
                required:
                  - code
                  - message
            required:
              - error

---
Let's break down the implementation step by step:

1. First, we need to define the response types based on the schema:
- CustomerLink: Represents the link object in the customer response
- CustomerPartner: Represents the partner object
- CustomerDiscount: Represents the discount object
- Customer: Main customer type containing all fields
- ListCustomersResponse: Type alias for the array of customers

2. For the method implementation:
- It will be an async method in the ExampleClientAsync class
- Will accept optional query parameters: email, externalId, includeExpandedFields
- Will return a list of Customer objects
- Will handle error responses using the ExampleError class

Here's the implementation:

```python
# ... existing imports ...
from typing import List, Literal, Optional, TypedDict

# ... existing ExampleClientAsync class ...

# Route: GET /customers
# Method: list
# Tags: Customers
async def list_customers(
    self,
    email: Optional[str] = None,
    external_id: Optional[str] = None,
    include_expanded_fields: Optional[bool] = None,
) -> List["Customer"]:
    query_params = {
        "email": email,
        "externalId": external_id,
        "includeExpandedFields": include_expanded_fields,
    }
    response = await self.fetch(
        method="GET",
        path="/customers",
        query={k: v for k, v in query_params.items() if v is not None},
    )
    
    if response.status == 200:
        return [Customer(**customer) for customer in await response.json()]
    else:
        error_data = await response.json()
        raise ExampleError(
            error=error_data["error"]["message"],
            status=response.status,
            data=error_data,
        )

# Type definitions
class CustomerLink(TypedDict):
    id: str
    domain: str
    key: str
    shortLink: str
    programId: Optional[str]

class CustomerPartner(TypedDict):
    id: str
    name: str
    email: str
    image: Optional[str]

class CustomerDiscount(TypedDict):
    id: str
    couponId: Optional[str]
    couponTestId: Optional[str]
    amount: float
    type: Literal["percentage", "flat"]
    duration: Optional[float]
    interval: Optional[Literal["month", "year"]]

class Customer(TypedDict):
    id: str
    externalId: str
    name: str
    email: Optional[str]
    avatar: Optional[str]
    country: Optional[str]
    createdAt: str
    link: Optional[CustomerLink]
    partner: Optional[CustomerPartner]
    discount: Optional[CustomerDiscount]

ListCustomersResponse = List[Customer]
```