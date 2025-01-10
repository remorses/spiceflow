openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /stream:
    get:
      x-fern-streaming:
        format: sse
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  count:
                    type: number
                  timestamp:
                    type: number
                required:
                  - count
                  - timestamp
        default:
          description: ''
      tags:
        - example-tag
      summary: Stream Endpoint
      description: |2-

                Returns an async generator when used in the sdk

                - Uses server sent events
                - But also has a response schema
                

---
Let's break this down step by step:

1. The route is GET /stream with Server-Sent Events (SSE) streaming
2. The response schema is an object with required fields `count` (number) and `timestamp` (number)
3. We need to create an async generator method that uses the existing `stream_sse_response` helper
4. The method should handle the streaming response and yield parsed events
5. We'll need to create a type for the response schema since it's not in types.py

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /stream
    # Method: GET
    # Tags: example-tag
    async def stream(self) -> AsyncGenerator["StreamResponse", None]:
        """Returns an async generator for the stream endpoint.
        
        Uses server sent events and yields StreamResponse objects.
        """
        response = await self.fetch("GET", "/stream")
        
        if response.status != 200:
            raise ExampleError(
                f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text(),
            )
            
        async for event in stream_sse_response(response):
            yield StreamResponse(**event)

# ... existing code ...

class StreamResponse:
    """Response type for GET /stream"""
    def __init__(self, count: float, timestamp: float):
        self.count = count
        self.timestamp = timestamp
```