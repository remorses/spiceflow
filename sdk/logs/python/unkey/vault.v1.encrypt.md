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
Let's break this down step by step:

1. We need to add a new async method to the `ExampleClientAsync` class
2. The method will handle POST requests to `/vault.v1.VaultService/Encrypt`
3. It will accept a `V1EncryptRequestBody` parameter and return a `V1EncryptResponseBody`
4. We need to handle error responses (400 and 500) using the defined error types
5. The method should use the existing `fetch` method for making requests
6. We'll add proper type hints and docstring

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # POST /vault.v1.VaultService/Encrypt
    # Tags: vault
    async def encrypt(
        self, 
        request: V1EncryptRequestBody
    ) -> V1EncryptResponseBody:
        """
        Encrypt data using the specified keyring.

        Args:
            request: V1EncryptRequestBody containing data and keyring

        Returns:
            V1EncryptResponseBody with encrypted data and key ID

        Raises:
            ExampleError: If the request fails with status 400 or 500
        """
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Encrypt",
            body=request
        )
        
        if response.status == 200:
            return V1EncryptResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

# ... existing code ...
```