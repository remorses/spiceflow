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
  /customers/{id}:
    get:
      operationId: getCustomer
      x-speakeasy-name-override: get
      summary: Retrieve a customer
      description: Retrieve a customer by ID for the authenticated workspace.
      tags:
        - Customers
      parameters:
        - in: path
          name: id
          description: The unique identifier of the customer in Dub.
          schema:
            type: string
            description: The unique identifier of the customer in Dub.
          required: true
        - in: query
          name: includeExpandedFields
          description: Whether to include expanded fields on the customer (`link`, `partner`, `discount`).
          schema:
            type: boolean
            description: Whether to include expanded fields on the customer (`link`, `partner`, `discount`).
      responses:
        '200':
          description: The customer object.
          content:
            application/json:
              schema:
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
To implement the `GET /customers/{id}` route in the `ExampleClient` class, we will create a new method called `getCustomer`. This method will:

1. **Define the route path, method, and tags** in a comment above the method.
2. **Use the `fetch` method** to make the API call.
3. **Handle request parameters** for the customer ID and optional query parameters.
4. **Serialize the response** to the appropriate TypeScript type.
5. **Include error handling** for various response statuses.

The response type will be based on the OpenAPI schema provided, and we will use the types defined in `./components.ts` for the customer object.

Here’s the code snippet to add to the `ExampleClient` class in `./client.ts`:

```typescript:client.ts
  // GET /customers/{id}
  // Retrieves a customer by ID for the authenticated workspace.
  async getCustomer(
    id: string,
    includeExpandedFields?: boolean
  ): Promise<types.Customer | ExampleError> {
    const response = await this.fetch<undefined>({
      method: 'GET',
      path: `/customers/${id}`,
      query: { includeExpandedFields },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json() as Promise<types.Customer>;
  }
```

### Explanation of the Code:
- The method `getCustomer` takes in a required `id` parameter and an optional `includeExpandedFields` boolean.
- It calls the existing `fetch` method to make a GET request to the specified path.
- If the response is not OK, it throws an `ExampleError` with the error message and status.
- If the response is successful, it returns the parsed JSON response as a `types.Customer` object.

### Global Scope Declarations:
Make sure that the `Customer` type is defined in your `./components.ts` file, as it will be used for the response type.