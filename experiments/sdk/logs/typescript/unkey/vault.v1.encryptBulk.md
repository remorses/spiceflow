openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /vault.v1.VaultService/EncryptBulk:
    post:
      operationId: vault.v1.encryptBulk
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V1EncryptBulkRequestBody'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1EncryptBulkResponseBody'
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
    V1EncryptBulkResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1EncryptBulkResponseBody.json
          format: uri
          readOnly: true
          type: string
        encrypted:
          items:
            $ref: '#/components/schemas/Encrypted'
          type:
            - array
      required:
        - encrypted
      type: object
    Encrypted:
      additionalProperties: false
      properties:
        encrypted:
          type: string
        keyId:
          type: string
      required:
        - encrypted
        - keyId
      type: object
    V1EncryptBulkRequestBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1EncryptBulkRequestBody.json
          format: uri
          readOnly: true
          type: string
        data:
          items:
            type: string
          maxItems: 1000
          minItems: 1
          type:
            - array
        keyring:
          type: string
      required:
        - keyring
        - data
      type: object

---
To implement the new method for the OpenAPI route `POST /vault.v1.VaultService/EncryptBulk`, we will follow these steps:

1. **Define the Method**: We will create a method named `encryptBulk` in the `ExampleClient` class.
2. **Add Route Information**: Include a comment above the method that specifies the route path, method, and tags.
3. **Type Definitions**: Use the types defined in `./components.ts` for the request and response bodies.
4. **Request Serialization**: Serialize the request body to JSON.
5. **Response Handling**: Handle the response, including error handling for different status codes.
6. **Error Handling**: Throw appropriate errors based on the response status.

Here’s the code snippet to be added to the `./client.ts` file:

```typescript:client.ts
  // POST /vault.v1.VaultService/EncryptBulk
  // Tags: vault
  async encryptBulk(
    body: types.v1EncryptBulkRequestBody
  ): Promise<types.v1EncryptBulkResponseBody> {
    const response = await this.fetch<types.v1EncryptBulkRequestBody>({
      method: 'POST',
      path: '/vault.v1.VaultService/EncryptBulk',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400) {
        throw new ExampleError('Validation Error', {
          status: response.status,
          data: errorData as types.ValidationError,
        });
      } else if (response.status === 500) {
        throw new ExampleError('Server Error', {
          status: response.status,
          data: errorData as types.BaseError,
        });
      }
      throw new ExampleError('Unknown Error', {
        status: response.status,
        data: errorData,
      });
    }

    return (await response.json()) as types.v1EncryptBulkResponseBody;
  }
```

### Summary of Changes:
- Added the `encryptBulk` method to handle the `POST /vault.v1.VaultService/EncryptBulk` route.
- Utilized the types from `./components.ts` for both request and response.
- Implemented error handling for 400 and 500 status codes, throwing `ExampleError` with appropriate messages and data.