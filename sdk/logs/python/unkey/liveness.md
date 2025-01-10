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

1. We need to add a new async method to the `ExampleClientAsync` class for the `/v1/liveness` endpoint
2. The method should:
   - Make a GET request
   - Handle successful responses (200) by returning a `V1LivenessResponseBody`
   - Handle error responses (500) by raising an `ExampleError` with the `BaseError` data
   - Include proper type hints
   - Include a docstring with the route information
3. We'll use the existing `fetch` method to make the request
4. We'll need to handle response parsing and error handling

Here's the implementation:

```python:client.py
    # ... existing code ...

    # GET /v1/liveness
    # tags: liveness
    async def liveness(self) -> V1LivenessResponseBody:
        """Check if the service is alive"""
        response = await self.fetch("GET", "/v1/liveness")
        
        if response.status == 200:
            data = await response.json()
            return V1LivenessResponseBody(
                message=data["message"],
                schema=data.get("$schema")
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error=error_data["detail"],
                status=error_data["status"],
                data=BaseError(
                    detail=error_data["detail"],
                    instance=error_data["instance"],
                    request_id=error_data["requestId"],
                    status=error_data["status"],
                    title=error_data["title"],
                    type=error_data["type"]
                )
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # ... existing code ...
```