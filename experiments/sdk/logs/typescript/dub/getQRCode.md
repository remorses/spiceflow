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
  /qr:
    get:
      operationId: getQRCode
      x-speakeasy-name-override: get
      summary: Retrieve a QR code
      description: Retrieve a QR code for a link.
      tags:
        - QR Codes
      parameters:
        - in: query
          name: url
          description: The URL to generate a QR code for.
          schema:
            type: string
            description: The URL to generate a QR code for.
          required: true
        - in: query
          name: logo
          description: The logo to include in the QR code. Can only be used with a paid plan on Dub.co.
          schema:
            type: string
            description: The logo to include in the QR code. Can only be used with a paid plan on Dub.co.
        - in: query
          name: size
          description: The size of the QR code in pixels. Defaults to `600` if not provided.
          schema:
            type: number
            default: 600
            description: The size of the QR code in pixels. Defaults to `600` if not provided.
        - in: query
          name: level
          description: The level of error correction to use for the QR code. Defaults to `L` if not provided.
          schema:
            type: string
            enum:
              - L
              - M
              - Q
              - H
            default: L
            description: The level of error correction to use for the QR code. Defaults to `L` if not provided.
        - in: query
          name: fgColor
          description: The foreground color of the QR code in hex format. Defaults to `#000000` if not provided.
          schema:
            type: string
            default: '#000000'
            description: The foreground color of the QR code in hex format. Defaults to `#000000` if not provided.
        - in: query
          name: bgColor
          description: The background color of the QR code in hex format. Defaults to `#ffffff` if not provided.
          schema:
            type: string
            default: '#FFFFFF'
            description: The background color of the QR code in hex format. Defaults to `#ffffff` if not provided.
        - in: query
          name: hideLogo
          description: Whether to hide the logo in the QR code. Can only be used with a paid plan on Dub.co.
          schema:
            type: boolean
            default: 'false'
            description: Whether to hide the logo in the QR code. Can only be used with a paid plan on Dub.co.
        - in: query
          name: margin
          description: The size of the margin around the QR code. Defaults to 2 if not provided.
          schema:
            type: number
            default: 2
            description: The size of the margin around the QR code. Defaults to 2 if not provided.
        - in: query
          name: includeMargin
          description: 'DEPRECATED: Margin is included by default. Use the `margin` prop to customize the margin size.'
          schema:
            type: boolean
            default: 'true'
            description: 'DEPRECATED: Margin is included by default. Use the `margin` prop to customize the margin size.'
            deprecated: true
      responses:
        '200':
          description: The QR code
          content:
            image/png:
              schema:
                type: string
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
To implement the `GET /qr` route in the `ExampleClient` class, we will create a new method called `getQRCode`. This method will:

1. **Define the method signature** with appropriate input parameters, including optional fields.
2. **Use the existing `fetch` method** to make the API call.
3. **Handle the response** by checking for errors and returning the appropriate type.
4. **Include type definitions** for the input parameters and the expected output.

The input parameters will include `url`, `logo`, `size`, `level`, `fgColor`, `bgColor`, `hideLogo`, `margin`, and `includeMargin`, with appropriate types and defaults where specified. The output will be a `Promise<string>` representing the QR code image in PNG format.

Here’s the code snippet to add to the `ExampleClient` class in `client.ts`:

```typescript:client.ts
  // GET /qr
  // Retrieves a QR code for a link.
  async getQRCode({
    url,
    logo,
    size = 600,
    level = 'L',
    fgColor = '#000000',
    bgColor = '#FFFFFF',
    hideLogo = false,
    margin = 2,
    includeMargin = true,
  }: {
    url: string
    logo?: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    fgColor?: string
    bgColor?: string
    hideLogo?: boolean
    margin?: number
    includeMargin?: boolean
  }): Promise<string> {
    const response = await this.fetch({
      method: 'GET',
      path: '/qr',
      query: {
        url,
        logo,
        size,
        level,
        fgColor,
        bgColor,
        hideLogo,
        margin,
        includeMargin,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.blob().then(blob => URL.createObjectURL(blob));
  }
```

### Global Scope Declarations
At the end of the snippet, ensure to declare any types or functions that are necessary for the method to work correctly, if they are not already defined in the `components.ts` file. In this case, the `ExampleError` class is already defined, so no additional declarations are needed.