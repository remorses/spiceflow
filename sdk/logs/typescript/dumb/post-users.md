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

1. We need to add a new method to the `ExampleClient` class for the POST /users endpoint
2. The request body requires name, email, and age fields
3. The response returns a message string
4. We'll use the existing fetch method for making the API call
5. We'll add proper TypeScript types for both request and response
6. We'll include error handling using the existing ExampleError class

Here's the code to add to client.ts:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * POST /users
   * Tags: users
   */
  async createUser(body: { name: string; email: string; age: number }): Promise<{ message: string }> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/users',
        body
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to create user', {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error while creating user', {
        status: 500
      });
    }
  }
}

// ... rest of existing code ...
```

The code adds a new `createUser` method to the `ExampleClient` class that:
- Takes a properly typed request body
- Makes a POST request to /users
- Handles both successful and error responses
- Returns the typed response
- Uses the existing fetch infrastructure and error handling