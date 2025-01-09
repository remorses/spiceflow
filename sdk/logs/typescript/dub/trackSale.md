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
  /track/sale:
    post:
      operationId: trackSale
      x-speakeasy-name-override: sale
      summary: Track a sale
      description: Track a sale for a short link.
      tags:
        - Track
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                externalId:
                  type: string
                  maxLength: 100
                  default: ''
                  description: This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.
                customerId:
                  type: string
                  nullable: true
                  maxLength: 100
                  default: null
                  description: This is the unique identifier for the customer in the client's app. This is used to track the customer's journey.
                  deprecated: true
                amount:
                  type: integer
                  minimum: 0
                  description: The amount of the sale. Should be passed in cents.
                paymentProcessor:
                  type: string
                  enum:
                    - stripe
                    - shopify
                    - paddle
                  description: The payment processor via which the sale was made.
                eventName:
                  type: string
                  maxLength: 50
                  default: Purchase
                  description: The name of the sale event. It can be used to track different types of event for example 'Purchase', 'Upgrade', 'Payment', etc.
                  example: Purchase
                invoiceId:
                  type: string
                  nullable: true
                  default: null
                  description: The invoice ID of the sale.
                currency:
                  type: string
                  default: usd
                  description: The currency of the sale. Accepts ISO 4217 currency codes.
                metadata:
                  type: object
                  nullable: true
                  default: null
                  description: Additional metadata to be stored with the sale event.
              required:
                - amount
                - paymentProcessor
      responses:
        '200':
          description: A sale was tracked.
          content:
            application/json:
              schema:
                type: object
                properties:
                  eventName:
                    type: string
                  customer:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                        nullable: true
                      email:
                        type: string
                        nullable: true
                      avatar:
                        type: string
                        nullable: true
                      externalId:
                        type: string
                        nullable: true
                    required:
                      - id
                      - name
                      - email
                      - avatar
                      - externalId
                  sale:
                    type: object
                    properties:
                      amount:
                        type: number
                      currency:
                        type: string
                      paymentProcessor:
                        type: string
                      invoiceId:
                        type: string
                        nullable: true
                      metadata:
                        type: object
                        nullable: true
                    required:
                      - amount
                      - currency
                      - paymentProcessor
                      - invoiceId
                      - metadata
                required:
                  - eventName
                  - customer
                  - sale
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
Let me break down the implementation step by step:

1. First, we need to define the request and response types based on the OpenAPI schema:
- Request body type with required and optional fields
- Response type with nested customer and sale objects
- Error response types for different status codes

2. We'll create a new method in the ExampleClient class that:
- Takes the request body as input
- Makes a POST request to /track/sale
- Handles successful responses and error cases
- Returns properly typed response data

3. The implementation will:
- Use the existing fetch method
- Include proper type annotations
- Handle request/response serialization
- Include error handling

Here's the implementation:

```typescript:exampleClient.ts
export class ExampleClient {
  // ... existing code ...

  /**
   * POST /track/sale
   * @tags Track
   * @summary Track a sale
   * @description Track a sale for a short link.
   */
  async trackSale(
    request: {
      externalId?: string
      customerId?: string | null
      amount: number
      paymentProcessor: 'stripe' | 'shopify' | 'paddle'
      eventName?: string
      invoiceId?: string | null
      currency?: string
      metadata?: Record<string, any> | null
    }
  ): Promise<{
    eventName: string
    customer: {
      id: string
      name: string | null
      email: string | null
      avatar: string | null
      externalId: string | null
    }
    sale: {
      amount: number
      currency: string
      paymentProcessor: string
      invoiceId: string | null
      metadata: Record<string, any> | null
    }
  }> {
    const response = await this.fetch({
      method: 'POST',
      path: '/track/sale',
      body: request
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ExampleError(
        errorData?.error?.message || 'Failed to track sale',
        {
          status: response.status,
          data: errorData
        }
      )
    }

    return response.json()
  }
}

// Error types for reference
type BadRequestError = {
  error: {
    code: 'bad_request'
    message: string
    doc_url: string
  }
}

type UnauthorizedError = {
  error: {
    code: 'unauthorized'
    message: string
    doc_url: string
  }
}

type ForbiddenError = {
  error: {
    code: 'forbidden'
    message: string
    doc_url: string
  }
}

type NotFoundError = {
  error: {
    code: 'not_found'
    message: string
    doc_url: string
  }
}

type ConflictError = {
  error: {
    code: 'conflict'
    message: string
    doc_url: string
  }
}

type InviteExpiredError = {
  error: {
    code: 'invite_expired'
    message: string
    doc_url: string
  }
}

type UnprocessableEntityError = {
  error: {
    code: 'unprocessable_entity'
    message: string
    doc_url: string
  }
}

type RateLimitExceededError = {
  error: {
    code: 'rate_limit_exceeded'
    message: string
    doc_url: string
  }
}

type InternalServerError = {
  error: {
    code: 'internal_server_error'
    message: string
    doc_url: string
  }
}
```