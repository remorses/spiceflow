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
Let's break down what we need to implement:

1. We need to add a new method to the `ExampleClient` class for the `/v1/liveness` endpoint
2. The method should:
   - Use the existing `fetch` method
   - Handle GET request
   - Return the proper response type (`V1LivenessResponseBody`)
   - Handle error responses (`BaseError`)
3. We'll use the types from `./types.ts`
4. We'll add proper JSDoc comments for the method

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * @description This endpoint checks if the service is alive.
   * @route GET /v1/liveness
   * @tags liveness
   */
  async liveness(): Promise<types.V1LivenessResponseBody> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/v1/liveness',
      });

      if (!response.ok) {
        const errorData: types.BaseError = await response.json();
        throw new ExampleError(errorData.detail, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json() as Promise<types.V1LivenessResponseBody>;
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }
}

// ... existing code ...
```