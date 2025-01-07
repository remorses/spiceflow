Let's implement the POST /users endpoint step by step:

1. First, we need to define the request and response types for this endpoint
2. The request body requires name, email, and age fields
3. The response includes a message (required) and optional data
4. We'll create a class method that handles the request and response serialization
5. We'll add proper error handling using the existing ExampleError class

Here's the implementation:

```python:example_client_async.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # POST /users
    # Tags: example-tag
    async def create_user(self, name: str, email: str, age: int) -> Dict[str, Any]:
        """
        Create a new user
        
        Args:
            name: User's full name
            email: User's email address
            age: User's age (0-120)
            
        Returns:
            Dictionary containing response message and optional data
            
        Raises:
            ExampleError: If the request fails
        """
        body = {
            "name": name,
            "email": email,
            "age": age
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=body
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=error_data.get("message", "Failed to create user"),
                    status=response.status,
                    data=error_data
                )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                raise ExampleError(
                    error=f"Unexpected response: {response.status}",
                    status=response.status
                )
                
        return await response.json()

# ... existing code ...
```

The implementation includes:
- Type hints for all parameters and return values
- Proper error handling for non-200 responses
- Documentation of the method including parameters and possible exceptions
- Request body validation through type hints
- Response parsing with error handling
- Integration with the existing fetch method and error handling system