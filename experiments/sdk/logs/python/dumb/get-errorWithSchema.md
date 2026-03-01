openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /errorWithSchema:
    get:
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                required:
                  - message
        default:
          description: ''
      tags:
        - example-tag
      description: Always throws an error for testing error handling

---
Let's break this down step by step:

1. The route is GET /errorWithSchema with tag "example-tag"
2. The response schema is an object with a required "message" string field
3. We need to create a type for the successful response
4. We'll add the method to ExampleClientAsync class
5. We'll handle error responses using ExampleError
6. We'll use the existing fetch method for making requests

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /errorWithSchema
    # Method: GET
    # Tags: example-tag
    async def get_error_with_schema(self) -> Dict[str, str]:
        """Always throws an error for testing error handling"""
        response = await self.fetch(
            method="GET",
            path="/errorWithSchema",
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                error=f"Request failed with status {response.status}",
                status=response.status,
                data=error_data,
            )
            
        return await response.json()

# ... existing code ...
```

The implementation:
1. Adds a new async method `get_error_with_schema`
2. Uses the existing fetch method to make the GET request
3. Handles error responses by raising ExampleError
4. Returns the parsed JSON response for successful requests
5. Includes proper type hints for the return value
6. Adds a docstring with the route description
7. Includes the route path, method and tags in the comment above the method