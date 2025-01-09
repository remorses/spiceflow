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
  /domains/{slug}:
    patch:
      operationId: updateDomain
      x-speakeasy-name-override: update
      x-speakeasy-max-method-params: 2
      summary: Update a domain
      description: Update a domain for the authenticated workspace.
      tags:
        - Domains
      parameters:
        - in: path
          name: slug
          description: The domain name.
          schema:
            type: string
            description: The domain name.
            example: acme.com
          required: true
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                slug:
                  type: string
                  minLength: 1
                  maxLength: 190
                  description: Name of the domain.
                  example: acme.com
                expiredUrl:
                  type: string
                  nullable: true
                  description: Redirect users to a specific URL when any link under this domain has expired.
                  example: https://acme.com/expired
                notFoundUrl:
                  type: string
                  nullable: true
                  description: Redirect users to a specific URL when a link under this domain doesn't exist.
                  example: https://acme.com/not-found
                archived:
                  type: boolean
                  default: false
                  description: Whether to archive this domain. `false` will unarchive a previously archived domain.
                  example: false
                placeholder:
                  type: string
                  nullable: true
                  maxLength: 100
                  description: Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.
                  example: https://dub.co/help/article/what-is-dub
                logo:
                  type: string
                  nullable: true
                  description: The logo of the domain.
      responses:
        '200':
          description: The domain was updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DomainSchema'
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
  schemas:
    DomainSchema:
      type: object
      properties:
        id:
          type: string
          description: The unique identifier of the domain.
        slug:
          type: string
          description: The domain name.
          example: acme.com
        verified:
          type: boolean
          default: false
          description: Whether the domain is verified.
        primary:
          type: boolean
          default: false
          description: Whether the domain is the primary domain for the workspace.
        archived:
          type: boolean
          description: Whether the domain is archived.
          default: false
        placeholder:
          type: string
          nullable: true
          description: Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened.
          example: https://dub.co/help/article/what-is-dub
        expiredUrl:
          type: string
          nullable: true
          description: The URL to redirect to when a link under this domain has expired.
          example: https://acme.com/expired
        notFoundUrl:
          type: string
          nullable: true
          description: The URL to redirect to when a link under this domain doesn't exist.
          example: https://acme.com/not-found
        logo:
          type: string
          nullable: true
          description: The logo of the domain.
        createdAt:
          type: string
          description: The date the domain was created.
        updatedAt:
          type: string
          description: The date the domain was last updated.
        registeredDomain:
          type: object
          nullable: true
          properties:
            id:
              type: string
              description: The ID of the registered domain record.
            createdAt:
              type: string
              description: The date the domain was created.
            expiresAt:
              type: string
              description: The date the domain expires.
          required:
            - id
            - createdAt
            - expiresAt
          description: The registered domain record.
      required:
        - id
        - slug
        - verified
        - primary
        - archived
        - placeholder
        - expiredUrl
        - notFoundUrl
        - logo
        - createdAt
        - updatedAt
        - registeredDomain

---
Let's break down the implementation step by step:

1. First, we need to define the types for:
   - Request body (UpdateDomainRequest)
   - Response type (DomainSchema)
   - Error types (based on the error responses)

2. The method needs to:
   - Accept the domain slug as a path parameter
   - Accept an optional request body
   - Make a PATCH request using the existing fetch method
   - Handle the response and error cases

3. We'll add the method to the ExampleClient class

Here's the implementation:

```typescript:example-client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * PATCH /domains/{slug}
   * @tags Domains
   * @summary Update a domain
   * @description Update a domain for the authenticated workspace.
   */
  async updateDomain(
    slug: string,
    body?: {
      slug?: string
      expiredUrl?: string | null
      notFoundUrl?: string | null
      archived?: boolean
      placeholder?: string | null
      logo?: string | null
    }
  ): Promise<{
    id: string
    slug: string
    verified: boolean
    primary: boolean
    archived: boolean
    placeholder: string | null
    expiredUrl: string | null
    notFoundUrl: string | null
    logo: string | null
    createdAt: string
    updatedAt: string
    registeredDomain: {
      id: string
      createdAt: string
      expiresAt: string
    } | null
  }> {
    const response = await this.fetch({
      method: 'PATCH',
      path: `/domains/${slug}`,
      body
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ExampleError(errorData?.error?.message || 'Failed to update domain', {
        status: response.status,
        data: errorData
      })
    }

    return response.json()
  }
}

// ... existing code ...
```

The implementation includes:
- A well-documented method with OpenAPI route details
- Strong typing for both input and output
- Proper error handling using the existing ExampleError class
- Integration with the existing fetch method
- Support for all optional request body fields
- Full response type based on the DomainSchema

The code maintains compatibility with both browser and Node.js environments by using standard fetch API and avoiding platform-specific dependencies.