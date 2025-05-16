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
To implement the `POST /vault.v1.VaultService/Decrypt` route in the `ExampleClient` class, we will create a new method called `decrypt`. This method will:

1. **Define the route path, method, and tags** in a comment above the method.
2. **Use the `fetch` method** to make the API call.
3. **Handle request and response serialization** by using the appropriate types from `./components.ts`.
4. **Implement error handling** for different response statuses.
5. **Ensure all types are fully defined** and use optional fields where necessary.

### Step-by-step reasoning:
- The method will accept a request body of type `V1DecryptRequestBody` and return a promise that resolves to `V1DecryptResponseBody`.
- We will handle potential errors by checking the response status and throwing an `ExampleError` for non-200 responses.
- The method will be fully typed, ensuring that TypeScript can infer the types correctly.

Here is the code snippet to add to the `./client.ts` file:

```typescript:client.ts
// POST /vault.v1.VaultService/Decrypt
// Tags: vault
async decrypt(
  requestBody: types.V1DecryptRequestBody
): Promise<types.V1DecryptResponseBody> {
  const response = await this.fetch<types.V1DecryptRequestBody>({
    method: 'POST',
    path: '/vault.v1.VaultService/Decrypt',
    body: requestBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = errorData as types.BaseError | types.ValidationError;
    throw new ExampleError(error.detail, {
      status: response.status,
      data: error,
    });
  }

  return response.json() as Promise<types.V1DecryptResponseBody>;
}

// Type definitions for the method
export interface DecryptRequestBody extends types.V1DecryptRequestBody {}
export interface DecryptResponseBody extends types.V1DecryptResponseBody {}
```

### Summary of changes:
- Added a new method `decrypt` to handle the decryption API call.
- Included error handling for different response statuses.
- Used types from `./components.ts` for request and response bodies.