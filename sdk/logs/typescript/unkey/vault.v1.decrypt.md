openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /vault.v1.VaultService/Decrypt:
    post:
      operationId: vault.v1.decrypt
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V1DecryptRequestBody'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1DecryptResponseBody'
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
        - vault
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
    V1DecryptResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1DecryptResponseBody.json
          format: uri
          readOnly: true
          type: string
        plaintext:
          description: The plaintext value.
          type: string
      required:
        - plaintext
      type: object
    V1DecryptRequestBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1DecryptRequestBody.json
          format: uri
          readOnly: true
          type: string
        encrypted:
          description: The encrypted base64 string.
          minLength: 1
          type: string
        keyring:
          description: The keyring to use for encryption.
          type: string
      required:
        - keyring
        - encrypted
      type: object

---
Let's break down what we need to implement:

1. We need to add a new method to the `ExampleClient` class for the decrypt endpoint
2. The method should:
   - Accept a `V1DecryptRequestBody` as input
   - Return a `Promise<V1DecryptResponseBody>`
   - Handle error responses (400 and 500 status codes)
   - Use the existing `fetch` method
3. We'll use the types from `./types.ts` for type safety
4. The method should handle both successful responses and error cases

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * POST /vault.v1.VaultService/Decrypt
   * @tags vault
   * @param body The request body containing encrypted data and keyring
   * @returns Promise resolving to decrypted plaintext
   * @throws {ExampleError} When the request fails
   */
  async decrypt(body: types.V1DecryptRequestBody): Promise<types.V1DecryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Decrypt',
      body,
    });

    if (!response.ok) {
      let errorData: types.BaseError | types.ValidationError;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new ExampleError('Failed to parse error response', {
          status: response.status,
        });
      }

      throw new ExampleError(errorData.detail, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.V1DecryptResponseBody>;
  }
}

// ... existing code ...
```