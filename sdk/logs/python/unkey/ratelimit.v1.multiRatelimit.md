openapi: 3.0.0
info:
  title: Unkey API
  version: 1.0.0
servers:
  - url: https://api.unkey.dev
  - url: http://localhost
paths:
  /ratelimit.v1.RatelimitService/MultiRatelimit:
    post:
      operationId: ratelimit.v1.multiRatelimit
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V1RatelimitMultiRatelimitRequestBody'
        required: true
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V1RatelimitMultiRatelimitResponseBody'
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
    V1RatelimitMultiRatelimitResponseBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1RatelimitMultiRatelimitResponseBody.json
          format: uri
          readOnly: true
          type: string
        ratelimits:
          description: The rate limits that were checked.
          items:
            $ref: '#/components/schemas/SingleRatelimitResponse'
          type:
            - array
      required:
        - ratelimits
      type: object
    SingleRatelimitResponse:
      additionalProperties: false
      properties:
        current:
          description: The current number of requests made in the current window.
          format: int64
          type: integer
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
      type: object
    V1RatelimitMultiRatelimitRequestBody:
      additionalProperties: false
      properties:
        $schema:
          description: A URL to the JSON Schema for this object.
          example: https://api.unkey.dev/schemas/V1RatelimitMultiRatelimitRequestBody.json
          format: uri
          readOnly: true
          type: string
        ratelimits:
          description: The rate limits to check.
          items:
            $ref: '#/components/schemas/Item'
          type:
            - array
      required:
        - ratelimits
      type: object
    Item:
      additionalProperties: false
      properties:
        cost:
          default: 1
          description: The cost of the request.
          format: int64
          type: integer
        duration:
          description: The duration in milliseconds for the rate limit window.
          format: int64
          type: integer
        identifier:
          description: The identifier for the rate limit.
          type: string
        limit:
          description: The maximum number of requests allowed.
          format: int64
          type: integer
      required:
        - identifier
        - limit
        - duration
      type: object

---
Let's break down what we need to implement:

1. We need to add a new async method to the `ExampleClientAsync` class
2. The method will handle POST requests to `/ratelimit.v1.RatelimitService/MultiRatelimit`
3. It will accept a `V1RatelimitMultiRatelimitRequestBody` parameter
4. It will return a `V1RatelimitMultiRatelimitResponseBody` or raise appropriate errors
5. We need to handle the possible error responses (400 and 500)
6. We'll use the existing `fetch` method to make the request

Here's the implementation:

```python:client.py
    # ... existing code ...

    # POST /ratelimit.v1.RatelimitService/MultiRatelimit
    # Tags: ratelimit
    async def multi_ratelimit(
        self, request: Types.V1RatelimitMultiRatelimitRequestBody
    ) -> Types.V1RatelimitMultiRatelimitResponseBody:
        response = await self.fetch(
            method="POST",
            path="/ratelimit.v1.RatelimitService/MultiRatelimit",
            body=request,
        )
        
        if response.status == 200:
            return Types.V1RatelimitMultiRatelimitResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # ... existing code ...
```