openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /error:
    get:
      responses:
        '200':
          description: ''
        default:
          description: ''
      tags:
        - example-tag
      summary: Error Endpoint
      description: Always throws an error for testing error handling

---
Let's break this down step by step:

1. The route is GET /error with tag "example-tag"
2. It has no request parameters or body
3. It always throws an error, so we need to handle error responses
4. We'll add this as a method to the ExampleClientAsync class
5. We'll use the existing fetch method and ExampleError class
6. No specific types are needed from types.py since the endpoint has no defined schemas

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /error
    # Method: GET
    # Tags: example-tag
    async def get_error(self) -> None:
        """Always throws an error for testing error handling"""
        response = await self.fetch("GET", "/error")
        
        if response.status >= 400:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=error_data.get("error", "Unknown error"),
                    status=response.status,
                    data=error_data
                )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                raise ExampleError(
                    error=await response.text(),
                    status=response.status
                )

# ... existing code ...
```