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
Let's break down what we need to implement:

1. The route is GET /errorWithSchema
2. It returns a 200 response with a schema containing a required message string
3. It has a default error response
4. It's tagged with "example-tag"
5. We need to add a method to the ExampleClient class
6. We'll use the existing fetch method for making the request
7. We need to handle both success and error cases
8. We'll create specific types for the response

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * GET /errorWithSchema
   * @tags example-tag
   * @description Always throws an error for testing error handling
   */
  async getErrorWithSchema(): Promise<{ message: string }> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/errorWithSchema',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }
}

// ... existing code ...
```