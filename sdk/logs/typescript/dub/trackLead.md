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
  /track/lead:
    post:
      operationId: trackLead
      x-speakeasy-name-override: lead
      summary: Track a lead
      description: Track a lead for a short link.
      tags:
        - Track
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                clickId:
                  type: string
                  minLength: 1
                  description: The ID of the click in th Dub. You can read this value from `dub_id` cookie.
                eventName:
                  type: string
                  minLength: 1
                  maxLength: 50
                  description: The name of the event to track.
                  example: Sign up
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
                customerName:
                  type: string
                  nullable: true
                  maxLength: 100
                  default: null
                  description: Name of the customer in the client's app.
                customerEmail:
                  type: string
                  nullable: true
                  format: email
                  maxLength: 100
                  default: null
                  description: Email of the customer in the client's app.
                customerAvatar:
                  type: string
                  nullable: true
                  default: null
                  description: Avatar of the customer in the client's app.
                metadata:
                  type: object
                  nullable: true
                  default: null
                  description: Additional metadata to be stored with the lead event
              required:
                - clickId
                - eventName
      responses:
        '200':
          description: A lead was tracked.
          content:
            application/json:
              schema:
                type: object
                properties:
                  click:
                    type: object
                    properties:
                      id:
                        type: string
                    required:
                      - id
                  customer:
                    type: object
                    properties:
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
                      - name
                      - email
                      - avatar
                      - externalId
                required:
                  - click
                  - customer
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
To implement the `POST /track/lead` route in the `ExampleClient` class, we will follow these steps:

1. **Define Input and Output Types**: We will create types for the request body and the expected response based on the OpenAPI schema provided. The request body will include fields like `clickId`, `eventName`, and optional fields like `externalId`, `customerId`, etc. The response will include the `click` and `customer` objects.

2. **Add the Method**: We will add a method named `trackLead` to the `ExampleClient` class. This method will use the `fetch` method to make a POST request to the `/track/lead` endpoint.

3. **Error Handling**: We will handle potential errors by checking the response status and throwing an `ExampleError` if the response is not successful.

4. **Commenting**: We will add a comment above the method to indicate the route path, method, and tags.

5. **Global Type Declarations**: We will declare any necessary types at the end of the snippet.

Here is the code snippet to be added to the `./client.ts` file:

```typescript:client.ts
  // POST /track/lead
  // Tags: Track
  async trackLead(
    body: {
      clickId: string
      eventName: string
      externalId?: string
      customerId?: string | null
      customerName?: string | null
      customerEmail?: string | null
      customerAvatar?: string | null
      metadata?: Record<string, any> | null
    }
  ): Promise<{
    click: { id: string }
    customer: {
      name: string | null
      email: string | null
      avatar: string | null
      externalId: string | null
    }
  }> {
    const response = await this.fetch<{ clickId: string; eventName: string; externalId?: string; customerId?: string | null; customerName?: string | null; customerEmail?: string | null; customerAvatar?: string | null; metadata?: Record<string, any> | null }>({
      method: 'POST',
      path: '/track/lead',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, { status: response.status, data: errorData });
    }

    return response.json();
  }
}

// Global type declarations
type TrackLeadRequest = {
  clickId: string;
  eventName: string;
  externalId?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAvatar?: string | null;
  metadata?: Record<string, any> | null;
};

type TrackLeadResponse = {
  click: { id: string };
  customer: {
    name: string | null;
    email: string | null;
    avatar: string | null;
    externalId: string | null;
  };
};
```

This code snippet adds the `trackLead` method to the `ExampleClient` class, handling the request and response according to the OpenAPI specifications.