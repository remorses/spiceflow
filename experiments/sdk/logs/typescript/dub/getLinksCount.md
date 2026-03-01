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
To implement the `GET /links/count` route in the `ExampleClient` class, we will create a new method called `getLinksCount`. This method will handle the request to the API, including the necessary parameters, serialization, and error handling.

### Steps to Implement:
1. **Define the Method**: The method will be named `getLinksCount` and will be a part of the `ExampleClient` class.
2. **Add Route Information**: Include a comment above the method to specify the route path, method, and tags.
3. **Define Input Parameters**: The method will accept parameters for `domain`, `tagId`, `tagIds`, `tagNames`, `search`, `userId`, `showArchived`, `withTags`, and `groupBy`.
4. **Handle Fetch Logic**: Use the existing `fetch` method to make the API call.
5. **Type Definitions**: Ensure that the method is fully typed for both inputs and outputs.
6. **Error Handling**: Handle potential errors by checking the response status and throwing an `ExampleError` if necessary.

Here is the code snippet to be added to the `./client.ts` file:

```typescript:client.ts
  // GET /links/count
  // Retrieves the number of links for the authenticated workspace.
  async getLinksCount({
    domain,
    tagId,
    tagIds,
    tagNames,
    search,
    userId,
    showArchived = false,
    withTags = false,
    groupBy,
  }: {
    domain?: string;
    tagId?: string; // Deprecated
    tagIds?: string | string[];
    tagNames?: string | string[];
    search?: string;
    userId?: string;
    showArchived?: boolean;
    withTags?: boolean; // Deprecated
    groupBy?: 'domain' | 'tagId' | 'userId';
  }): Promise<number> {
    const response = await this.fetch<number>({
      method: 'GET',
      path: '/links/count',
      query: {
        domain,
        tagId,
        tagIds,
        tagNames,
        search,
        userId,
        showArchived,
        withTags,
        groupBy,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.error.message, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
```

### Summary of Changes:
- Added a new method `getLinksCount` to the `ExampleClient` class.
- The method is fully typed and handles optional parameters.
- It uses the existing `fetch` method for making the API call and includes error handling for non-200 responses.