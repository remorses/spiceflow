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
2. It returns a 200 response with a schema containing a required "message" string
3. It can return other error responses (default case)
4. We need to handle error responses using the existing ExampleError class
5. We'll add this as a method to the ExampleClient class

The method will:
- Use the existing fetch method
- Handle response parsing
- Throw ExampleError for non-200 responses
- Return the typed response for 200 status

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * GET /errorWithSchema
   * Tags: example-tag
   * Description: Always throws an error for testing error handling
   */
  async errorWithSchema(): Promise<{ message: string }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/errorWithSchema',
    })

    if (!response.ok) {
      let errorData: any
      try {
        errorData = await response.json()
      } catch (error) {
        errorData = await response.text()
      }
      throw new ExampleError('Request failed', {
        status: response.status,
        data: errorData,
      })
    }

    return response.json()
  }
}

// ... existing code ...
```

The implementation adds a new method `errorWithSchema` to the ExampleClient class that:
1. Makes a GET request to /errorWithSchema
2. Checks if response is not OK (status >= 400)
3. Attempts to parse error response as JSON, falls back to text
4. Throws ExampleError with status and error data
5. Returns parsed JSON response for successful requests

The method is fully typed with the expected return type `{ message: string }` based on the OpenAPI schema.