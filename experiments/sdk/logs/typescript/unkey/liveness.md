openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /v1/liveness:
    get:
      description: This endpoint checks if the service is alive.
      operationId: liveness
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1LivenessResponseBody'
          description: OK
        '500':
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/BaseError'
          description: Internal Server Error
      summary: Liveness check
      tags:
        - liveness
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
    V1LivenessResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1LivenessResponseBody.json
          format: uri
          readOnly: true
          type: string
        message:
          description: Whether we're alive or not
          example: OK
          type: string
      required:
        - message
      type: object

---
To implement the `GET /v1/liveness` route in the `ExampleClient` class, we will create a new method called `checkLiveness`. This method will:

1. **Define the route path, method, and tags** in a comment above the method.
2. **Use the existing `fetch` method** to make the API call.
3. **Handle the response** by serializing it into the appropriate type (`V1LivenessResponseBody`).
4. **Implement error handling** to throw an `ExampleError` in case of a non-200 response.

The method will be fully typed for both inputs and outputs, and it will utilize the types defined in `./components.ts`.

Here’s the code snippet to add to the `./client.ts` file:

```typescript:client.ts
  // GET /v1/liveness
  // Summary: Liveness check
  // Tags: liveness
  async checkLiveness(): Promise<V1LivenessResponseBody> {
    const response = await this.fetch<V1LivenessResponseBody>({
      method: 'GET',
      path: '/v1/liveness',
    });

    if (!response.ok) {
      const errorData: BaseError = await response.json();
      throw new ExampleError(errorData.detail, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<V1LivenessResponseBody>;
  }
```

### Summary of Changes:
- Added a new method `checkLiveness` to the `ExampleClient` class.
- The method makes a `GET` request to the `/v1/liveness` endpoint.
- It handles the response and errors appropriately, ensuring that the output is typed as `V1LivenessResponseBody`.