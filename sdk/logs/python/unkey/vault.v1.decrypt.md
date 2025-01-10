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
Let's break this down step by step:

1. We need to add a new async method to the `ExampleClientAsync` class
2. The method will handle POST requests to `/vault.v1.VaultService/Decrypt`
3. It will accept a `V1DecryptRequestBody` parameter and return a `V1DecryptResponseBody`
4. We need to handle potential errors (400 and 500 status codes)
5. We'll use the existing `fetch` method to make the request
6. We'll add proper type hints and documentation

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # POST /vault.v1.VaultService/Decrypt
    # Tags: vault
    async def decrypt(
        self, 
        request_body: V1DecryptRequestBody
    ) -> V1DecryptResponseBody:
        """
        Decrypts the provided encrypted value using the specified keyring.

        Args:
            request_body: The decryption request containing the encrypted data and keyring

        Returns:
            V1DecryptResponseBody: The response containing the decrypted plaintext

        Raises:
            ExampleError: If the request fails with a 400 or 500 status code
        """
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Decrypt",
            body=request_body.__dict__,
        )
        
        if response.status == 200:
            return V1DecryptResponseBody(**await response.json())
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