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

1. The route is GET /error with no parameters or request body
2. It has no defined response schema, so we'll use `any` for the response type
3. We need to add a method to the ExampleClient class
4. We'll use the existing fetch method for making the request
5. We'll handle errors using the ExampleError class
6. The method should be async and return a Promise<any>

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * GET /error
   * Tags: example-tag
   * Summary: Error Endpoint
   * Description: Always throws an error for testing error handling
   */
  async getError(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/error',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Network error', { status: 500, data: error })
    }
  }
}

// ... existing code ...
```