openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /users:
    post:
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
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
                  format: email
                age:
                  type: number
                  minimum: 0
                  maximum: 120
              required:
                - name
                - email
                - age
              additionalProperties: false

---
Let's break this down step by step:

1. We need to create a new async method in the `ExampleClientAsync` class for POST /users
2. The method needs to:
   - Accept required parameters: name, email, age
   - Return the response message
   - Handle error cases
   - Use proper type hints
3. We'll need to create a type for the request body since it's not in types.py
4. We'll create a response type for the successful response
5. We'll add proper error handling

Here's the implementation:

```python:client.py
# ... existing code ...

class ExampleClientAsync:
    # ... existing code ...

    # POST /users
    # Method: POST
    # Tags: users
    async def create_user(
        self,
        name: str,
        email: str,
        age: float,
    ) -> str:
        """
        Create a new user
        
        Args:
            name: User's full name
            email: User's email address
            age: User's age
            
        Returns:
            The success message from the API
            
        Raises:
            ExampleError: If the API returns an error
        """
        request_body = {
            "name": name,
            "email": email,
            "age": age,
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=request_body,
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                error=f"Failed to create user: {response.status}",
                status=response.status,
                data=error_data,
            )
            
        response_data = await response.json()
        return response_data["message"]

# ... rest of existing code ...
```

The code adds a new `create_user` method that:
1. Takes required parameters with proper type hints
2. Creates the request body
3. Makes the API call using the existing fetch method
4. Handles error cases
5. Returns the success message from the API
6. Includes proper docstring and type hints for IDE support