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

1. We need to add a new async method to handle the GET /stream endpoint
2. The endpoint returns an SSE stream, so we'll use the existing `stream_sse_response` helper
3. The response schema is an object with required fields `count` and `timestamp` (both numbers)
4. We'll create a specific type for the stream response
5. The method should be a generator that yields the parsed events
6. We'll add proper type hints and error handling

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /stream
    # Method: GET
    # Tags: example-tag
    async def stream(self) -> AsyncGenerator[Dict[str, float], None]:
        """Returns an async generator for the stream endpoint.
        
        Uses server sent events and yields parsed JSON objects with count and timestamp.
        """
        response = await self.fetch(
            method="GET",
            path="/stream",
            headers={"Accept": "text/event-stream"}
        )
        
        if response.status != 200:
            raise ExampleError(
                f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )
            
        async for event in stream_sse_response(response):
            yield event

# ... existing code ...
```

The implementation adds a new `stream` method that:
1. Makes a GET request to /stream with the appropriate headers
2. Checks for non-200 status codes and raises an ExampleError
3. Uses the existing stream_sse_response helper to parse the SSE stream
4. Yields each parsed event as a dictionary with float values
5. Includes proper type hints and documentation

The method is fully async and compatible with Python's async/await syntax, and includes proper error handling for both HTTP errors and SSE parsing errors.