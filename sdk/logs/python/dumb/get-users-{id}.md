openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /users/{id}:
    get:
      parameters:
        - schema:
            type: string
          in: path
          name: id
          required: true
      responses:
        '200':
          description: ''
        default:
          description: ''
      tags:
        - example-tag

---
Let's break this down step by step:

1. We need to add a new async method to the `ExampleClientAsync` class
2. The route is GET /users/{id} with a required path parameter
3. We'll use the existing `fetch` method to make the API call
4. We'll add proper type hints and error handling
5. We'll add the required docstring with route information
6. Since there are no response schemas defined, we'll return Any type

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /users/{id} - example-tag
    async def get_user(self, id: str) -> Any:
        """Get user by ID
        
        Args:
            id: User ID to retrieve
            
        Returns:
            Any: The user data
            
        Raises:
            ExampleError: If the API returns an error
        """
        response = await self.fetch(
            method="GET",
            path=f"/users/{id}"
        )
        
        if response.status != 200:
            error_data = await response.json()
            raise ExampleError(
                error=f"Failed to get user: {error_data.get('message', 'Unknown error')}",
                status=response.status,
                data=error_data
            )
            
        return await response.json()

# ... existing code ...
```

The implementation adds a new `get_user` method that:
- Takes a required `id` parameter
- Makes a GET request to the /users/{id} endpoint
- Handles error responses by raising ExampleError
- Returns the parsed JSON response for successful requests
- Includes proper type hints and documentation
- Uses the existing fetch method for making the API call