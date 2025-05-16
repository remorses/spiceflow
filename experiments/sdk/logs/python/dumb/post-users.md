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

1. We need to add a new method to handle POST /users
2. The request body requires name (str), email (str), and age (float)
3. The response returns a message (str)
4. We'll need to:
   - Add type hints for request and response
   - Handle error cases
   - Use the existing fetch method
   - Add proper documentation

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
            Success message from the API
            
        Raises:
            ExampleError: If the API returns an error
        """
        body = {
            "name": name,
            "email": email,
            "age": age,
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=body,
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