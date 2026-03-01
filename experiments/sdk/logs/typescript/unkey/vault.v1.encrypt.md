openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /vault.v1.VaultService/Encrypt:
    post:
      operationId: vault.v1.encrypt
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V1EncryptRequestBody'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1EncryptResponseBody'
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
    V1EncryptResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1EncryptResponseBody.json
          format: uri
          readOnly: true
          type: string
        encrypted:
          description: The encrypted data as base64 encoded string.
          type: string
        keyId:
          description: The ID of the key used for encryption.
          type: string
      required:
        - encrypted
        - keyId
      type: object
    V1EncryptRequestBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1EncryptRequestBody.json
          format: uri
          readOnly: true
          type: string
        data:
          description: The data to encrypt.
          minLength: 1
          type: string
        keyring:
          description: The keyring to use for encryption.
          type: string
      required:
        - keyring
        - data
      type: object

---
To implement the `POST /vault.v1.VaultService/Encrypt` route in the `ExampleClient` class, we will create a new method called `encrypt`. This method will:

1. **Define the route path, method, and tags** in a comment above the method.
2. **Use the `fetch` method** to make the API call.
3. **Handle request serialization** by accepting a `V1EncryptRequestBody` type as input.
4. **Handle response serialization** by returning a `V1EncryptResponseBody` type.
5. **Include error handling** for different response statuses (200, 400, 500).
6. **Use optional fields** where required and `any` for unspecified types.

The method will be fully typed for both inputs and outputs, ensuring that it can be used in both Node.js and browser environments.

Here’s the code snippet to add to the `./client.ts` file:

```typescript:client.ts
// POST /vault.v1.VaultService/Encrypt
// Tags: vault
async encrypt(
  body: types.v1EncryptRequestBody
): Promise<types.v1EncryptResponseBody> {
  try {
    const response = await this.fetch<types.v1EncryptRequestBody>({
      method: 'POST',
      path: '/vault.v1.VaultService/Encrypt',
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

    return (await response.json()) as types.v1EncryptResponseBody;
  } catch (error) {
    throw new ExampleError('Request Failed', { status: 0, data: error });
  }
}

// Type definitions for the new method
export interface EncryptRequestBody extends types.V1EncryptRequestBody {}
export interface EncryptResponseBody extends types.V1EncryptResponseBody {}
``` 

This code snippet adds the `encrypt` method to the `ExampleClient` class, handling the API call and error management as specified.