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
2. The method will handle GET requests to `/users/{id}`
3. The method needs to:
   - Accept a required `id` parameter (string)
   - Make an async HTTP request using aiohttp
   - Handle potential errors
   - Return the response data
4. We'll use the existing `fetch` method to handle the actual HTTP request
5. We'll add proper type hints and documentation

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # GET /users/{id}
    # tags: example-tag
    async def get_user(self, id: str) -> Any:
        """Get user by ID
        
        Args:
            id: The user ID to retrieve
            
        Returns:
            The user data
            
        Raises:
            ExampleError: If the request fails
        """
        response = await self.fetch(
            method="GET",
            path=f"/users/{id}"
        )
        
        if response.status != 200:
            error_data = await response.json() if response.content else None
            raise ExampleError(
                error=f"Failed to get user: {response.status}",
                status=response.status,
                data=error_data
            )
            
        return await response.json()

# ... existing code ...
```