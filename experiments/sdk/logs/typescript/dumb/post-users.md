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
2. The endpoint requires:
   - Request body with name, email, and age (all required)
   - Returns a response with a message string
3. We'll use the existing `fetch` method in the class
4. We'll need to create type interfaces for both the request and response
5. We'll add proper error handling using the existing `ExampleError` class

Here's the code to add to `client.ts`:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * POST /users
   * @tags users
   */
  async createUser(body: { name: string; email: string; age: number }): Promise<{ message: string }> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/users',
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to create user', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error while creating user', {
        status: 500,
        data: error,
      });
    }
  }
}

// ... existing code ...
```

The code adds a new `createUser` method to the `ExampleClient` class that:
- Takes a strongly typed body parameter
- Returns a Promise with the response type
- Includes proper error handling
- Uses the existing fetch infrastructure
- Has proper JSDoc documentation with route and tags
- Maintains compatibility with both browser and Node.js environments