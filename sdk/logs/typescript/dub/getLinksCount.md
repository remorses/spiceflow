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
  /links/count:
    get:
      operationId: getLinksCount
      x-speakeasy-name-override: count
      summary: Retrieve links count
      description: Retrieve the number of links for the authenticated workspace.
      tags:
        - Links
      parameters:
        - in: query
          name: domain
          description: The domain to filter the links by. E.g. `ac.me`. If not provided, all links for the workspace will be returned.
          schema:
            type: string
            description: The domain to filter the links by. E.g. `ac.me`. If not provided, all links for the workspace will be returned.
        - in: query
          name: tagId
          description: Deprecated. Use `tagIds` instead. The tag ID to filter the links by.
          schema:
            type: string
            description: Deprecated. Use `tagIds` instead. The tag ID to filter the links by.
            deprecated: true
        - in: query
          name: tagIds
          description: The tag IDs to filter the links by.
          schema:
            anyOf:
              - type: string
              - type: array
                items:
                  type: string
            description: The tag IDs to filter the links by.
        - in: query
          name: tagNames
          description: The unique name of the tags assigned to the short link (case insensitive).
          schema:
            anyOf:
              - type: string
              - type: array
                items:
                  type: string
            description: The unique name of the tags assigned to the short link (case insensitive).
        - in: query
          name: search
          description: The search term to filter the links by. The search term will be matched against the short link slug and the destination url.
          schema:
            type: string
            description: The search term to filter the links by. The search term will be matched against the short link slug and the destination url.
        - in: query
          name: userId
          description: The user ID to filter the links by.
          schema:
            type: string
            description: The user ID to filter the links by.
        - in: query
          name: showArchived
          description: Whether to include archived links in the response. Defaults to `false` if not provided.
          schema:
            type: boolean
            default: 'false'
            description: Whether to include archived links in the response. Defaults to `false` if not provided.
        - in: query
          name: withTags
          description: DEPRECATED. Filter for links that have at least one tag assigned to them.
          schema:
            type: boolean
            default: 'false'
            description: DEPRECATED. Filter for links that have at least one tag assigned to them.
            deprecated: true
        - in: query
          name: groupBy
          description: The field to group the links by.
          schema:
            anyOf:
              - type: string
                enum:
                  - domain
              - type: string
                enum:
                  - tagId
              - type: string
                enum:
                  - userId
            description: The field to group the links by.
      responses:
        '200':
          description: A list of links
          content:
            application/json:
              schema:
                type: number
                description: The number of links matching the query.
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
Let's break this down step by step:

1. We need to add a new method to the `ExampleClient` class for the `/links/count` endpoint
2. The method should:
   - Accept all query parameters defined in the OpenAPI spec
   - Return a Promise that resolves to a number (the count)
   - Handle potential errors using the existing ExampleError class
   - Use the existing fetch method for making the request
3. The query parameters need to be properly typed, including:
   - Optional fields
   - Union types for parameters that accept multiple types
   - Deprecated fields should still be included but marked as deprecated
4. We'll use the error types from the components.ts file

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing methods ...

  /**
   * GET /links/count
   * Retrieve the number of links for the authenticated workspace.
   * Tags: Links
   */
  async countLinks(params?: {
    domain?: string;
    /** @deprecated Use tagIds instead */
    tagId?: string;
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    /** @deprecated */
    withTags?: boolean;
    groupBy?: 'domain' | 'tagId' | 'userId';
  }): Promise<number> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/links/count',
        query: params ? {
          ...params,
          tagIds: Array.isArray(params.tagIds) ? params.tagIds.join(',') : params.tagIds,
          tagNames: Array.isArray(params.tagNames) ? params.tagNames.join(',') : params.tagNames,
        } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.error.message, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }
}

// ... rest of existing code ...
```