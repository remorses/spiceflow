openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /ratelimit.v1.RatelimitService/Ratelimit:
    post:
      operationId: ratelimit.v1.ratelimit
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V1RatelimitRatelimitRequestBody'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1RatelimitRatelimitResponseBody'
          description: OK
        '400':
          description: Bad request
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/ValidationError'
        '500':
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/BaseError'
          description: Error
      tags:
        - ratelimit
components:
  schemas:
    BaseError:
      properties:
        requestId:
          description: A unique id for this request. Please always provide this to support.
          example: req_123
          type: string
        detail:
          description: A human-readable explanation specific to this occurrence of the problem.
          example: Property foo is required but is missing.
          type: string
        instance:
          description: A URI reference that identifies the specific occurrence of the problem.
          example: https://example.com/error-log/abc123
          format: uri
          type: string
        status:
          description: HTTP status code
          example: 400
          format: int
          type: integer
        title:
          description: A short, human-readable summary of the problem type. This value should not change between occurrences of the error.
          example: Bad Request
          type: string
        type:
          default: about:blank
          description: A URI reference to human-readable documentation for the error.
          example: https://example.com/errors/example
          format: uri
          type: string
      type: object
      required:
        - requestId
        - detail
        - instance
        - status
        - title
        - type
    ValidationError:
      additionalProperties: false
      properties:
        requestId:
          description: A unique id for this request. Please always provide this to support.
          example: req_123
          type: string
        detail:
          description: A human-readable explanation specific to this occurrence of the problem.
          example: Property foo is required but is missing.
          type: string
        errors:
          description: Optional list of individual error details
          items:
            $ref: '#/components/schemas/ValidationErrorDetail'
          type:
            - array
        instance:
          description: A URI reference that identifies the specific occurrence of the problem.
          example: https://example.com/error-log/abc123
          format: uri
          type: string
        status:
          description: HTTP status code
          example: 400
          format: int
          type: integer
        title:
          description: A short, human-readable summary of the problem type. This value should not change between occurrences of the error.
          example: Bad Request
          type: string
        type:
          default: about:blank
          description: A URI reference to human-readable documentation for the error.
          example: https://example.com/errors/example
          format: uri
          type: string
      type: object
      required:
        - requestId
        - detail
        - instance
        - status
        - title
        - type
        - errors
    ValidationErrorDetail:
      additionalProperties: false
      properties:
        location:
          description: Where the error occurred, e.g. 'body.items[3].tags' or 'path.thing-id'
          type: string
        message:
          description: Error message text
          type: string
        fix:
          description: A human-readable message describing how to fix the error.
          type: string
      type: object
      required:
        - message
        - location
    V1RatelimitRatelimitResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1RatelimitRatelimitResponseBody.json
          format: uri
          readOnly: true
          type: string
        current:
          description: The current number of requests made in the current window.
          format: int64
          type: integer
        lease:
          description: The lease to use when committing the request.
          type:
            - string
        limit:
          description: The maximum number of requests allowed.
          format: int64
          type: integer
        remaining:
          description: The number of requests remaining in the current window.
          format: int64
          type: integer
        reset:
          description: The time in milliseconds when the rate limit will reset.
          format: int64
          type: integer
        success:
          description: Whether the request passed the ratelimit. If false, the request must be blocked.
          type: boolean
      required:
        - limit
        - remaining
        - reset
        - success
        - current
        - lease
      type: object
    V1RatelimitRatelimitRequestBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1RatelimitRatelimitRequestBody.json
          format: uri
          readOnly: true
          type: string
        cost:
          description: The cost of the request. Defaults to 1 if not provided.
          format: int64
          type: integer
          default: 1
        duration:
          description: The duration in milliseconds for the rate limit window.
          format: int64
          type: integer
        identifier:
          description: The identifier for the rate limit.
          type: string
        lease:
          $ref: '#/components/schemas/Lease'
          description: Reserve an amount of tokens with the option to commit and update later.
        limit:
          description: The maximum number of requests allowed.
          format: int64
          type: integer
      required:
        - identifier
        - limit
        - duration
      type: object
    Lease:
      additionalProperties: false
      properties:
        cost:
          description: How much to lease.
          format: int64
          type: integer
        timeout:
          description: The time in milliseconds when the lease will expire. If you do not commit the lease by this time, it will be commited as is.
          format: int64
          type: integer
      required:
        - cost
        - timeout
      type: object

---
To implement the new method for the OpenAPI route `POST /ratelimit.v1.RatelimitService/Ratelimit`, we will follow these steps:

1. **Define the Method**: We will create a method named `ratelimit` within the `ExampleClient` class. This method will handle the request to the specified endpoint.

2. **Add Route Information**: We will include a comment above the method that specifies the route path, method, and tags.

3. **Type Definitions**: The method will accept a parameter of type `V1RatelimitRatelimitRequestBody` for the request body and will return a promise that resolves to `V1RatelimitRatelimitResponseBody`.

4. **Error Handling**: We will handle potential errors by checking the response status and throwing an `ExampleError` if the response indicates a failure.

5. **Serialization**: The request body will be serialized to JSON, and the response will be deserialized from JSON.

6. **Global Scope Declarations**: We will ensure that all necessary types are declared at the end of the snippet.

Here is the code snippet to be added to the `./client.ts` file:

```typescript:client.ts
// POST /ratelimit.v1.RatelimitService/Ratelimit
// Tags: ratelimit
async ratelimit(
  body: types.v1RatelimitRatelimitRequestBody
): Promise<types.v1RatelimitRatelimitResponseBody> {
  const response = await this.fetch<types.v1RatelimitRatelimitRequestBody>({
    method: 'POST',
    path: '/ratelimit.v1.RatelimitService/Ratelimit',
    body,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ExampleError('Error occurred while fetching rate limit', {
      status: response.status,
      data: errorData,
    });
  }

  return response.json() as Promise<types.v1RatelimitRatelimitResponseBody>;
}

// Type declarations for the method
export interface RatelimitRequestBody extends types.v1RatelimitRatelimitRequestBody {}
export interface RatelimitResponseBody extends types.v1RatelimitRatelimitResponseBody {}
```

This code snippet adds the `ratelimit` method to the `ExampleClient` class, handling the API call, serialization, and error management as specified.