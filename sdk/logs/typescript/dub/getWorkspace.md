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
  /workspaces/{idOrSlug}:
    get:
      operationId: getWorkspace
      x-speakeasy-name-override: get
      summary: Retrieve a workspace
      description: Retrieve a workspace for the authenticated user.
      tags:
        - Workspaces
      parameters:
        - in: path
          name: idOrSlug
          description: The ID or slug of the workspace.
          schema:
            type: string
            description: The ID or slug of the workspace.
          required: true
      responses:
        '200':
          description: The retrieved workspace
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkspaceSchema'
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
    WorkspaceSchema:
      type: object
      properties:
        id:
          type: string
          description: The unique ID of the workspace.
        name:
          type: string
          description: The name of the workspace.
        slug:
          type: string
          description: The slug of the workspace.
        logo:
          type: string
          nullable: true
          default: null
          description: The logo of the workspace.
        inviteCode:
          type: string
          nullable: true
          description: The invite code of the workspace.
        plan:
          type: string
          enum:
            - free
            - pro
            - business
            - business plus
            - business extra
            - business max
            - enterprise
          description: The plan of the workspace.
        stripeId:
          type: string
          nullable: true
          description: The Stripe ID of the workspace.
        billingCycleStart:
          type: number
          description: The date and time when the billing cycle starts for the workspace.
        paymentFailedAt:
          type: string
          nullable: true
          description: The date and time when the payment failed for the workspace.
        stripeConnectId:
          type: string
          nullable: true
          description: '[BETA – Dub Conversions]: The Stripe Connect ID of the workspace.'
        payoutMethodId:
          type: string
          nullable: true
          description: '[BETA – Dub Partners]: The ID of the payment method for partner payouts.'
        usage:
          type: number
          description: The usage of the workspace.
        usageLimit:
          type: number
          description: The usage limit of the workspace.
        linksUsage:
          type: number
          description: The links usage of the workspace.
        linksLimit:
          type: number
          description: The links limit of the workspace.
        salesUsage:
          type: number
          description: The dollar amount of tracked revenue in the current billing cycle (in cents).
        salesLimit:
          type: number
          description: The limit of tracked revenue in the current billing cycle (in cents).
        domainsLimit:
          type: number
          description: The domains limit of the workspace.
        tagsLimit:
          type: number
          description: The tags limit of the workspace.
        usersLimit:
          type: number
          description: The users limit of the workspace.
        aiUsage:
          type: number
          description: The AI usage of the workspace.
        aiLimit:
          type: number
          description: The AI limit of the workspace.
        conversionEnabled:
          type: boolean
          description: Whether the workspace has conversion tracking enabled (d.to/conversions).
        dotLinkClaimed:
          type: boolean
          description: Whether the workspace has claimed a free .link domain. (dub.link/free)
        partnersEnabled:
          type: boolean
          description: Whether the workspace has Dub Partners enabled.
        createdAt:
          type: string
          description: The date and time when the workspace was created.
        users:
          type: array
          items:
            type: object
            properties:
              role:
                type: string
                enum:
                  - owner
                  - member
                description: The role of the authenticated user in the workspace.
            required:
              - role
          description: The role of the authenticated user in the workspace.
        domains:
          type: array
          items:
            type: object
            properties:
              slug:
                type: string
                description: The domain name.
                example: acme.com
              primary:
                type: boolean
                default: false
                description: Whether the domain is the primary domain for the workspace.
              verified:
                type: boolean
                default: false
                description: Whether the domain is verified.
            required:
              - slug
              - primary
              - verified
          description: The domains of the workspace.
        flags:
          type: object
          additionalProperties:
            type: boolean
          description: The feature flags of the workspace, indicating which features are enabled.
      required:
        - id
        - name
        - slug
        - logo
        - inviteCode
        - plan
        - stripeId
        - billingCycleStart
        - paymentFailedAt
        - stripeConnectId
        - payoutMethodId
        - usage
        - usageLimit
        - linksUsage
        - linksLimit
        - salesUsage
        - salesLimit
        - domainsLimit
        - tagsLimit
        - usersLimit
        - aiUsage
        - aiLimit
        - conversionEnabled
        - dotLinkClaimed
        - partnersEnabled
        - createdAt
        - users
        - domains
      title: Workspace

---
To implement the `GET /workspaces/{idOrSlug}` route in the `ExampleClient` class, we will create a new method called `getWorkspace`. This method will:

1. **Define the route path, method, and tags** in a comment above the method.
2. **Use the `fetch` method** to make the API call.
3. **Handle the request and response serialization** by defining the input and output types.
4. **Include error handling** for various response statuses.
5. **Use the existing types** from `./components.ts` for the response type.

### Step-by-step reasoning:
- The method will accept a parameter `idOrSlug` which is required.
- The response will be typed as `Workspace` from the `components.ts` file.
- We will handle potential errors by checking the response status and throwing an `ExampleError` if the response is not successful.

Here is the code snippet to add to the `./client.ts` file:

```typescript:client.ts
  // GET /workspaces/{idOrSlug} - Retrieve a workspace
  async getWorkspace(idOrSlug: string): Promise<Workspace> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: `/workspaces/${encodeURIComponent(idOrSlug)}`,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<Workspace>;
  }
```

This method will allow users to retrieve a workspace by its ID or slug, handling errors appropriately and returning the expected `Workspace` type.