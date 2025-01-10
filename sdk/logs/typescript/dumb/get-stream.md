openapi: 3.1.3
info:
  title: Spiceflow Documentation
  description: Development documentation
  version: 0.0.0
servers:
  - url: https://api.com
paths:
  /stream:
    get:
      x-fern-streaming:
        format: sse
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  count:
                    type: number
                  timestamp:
                    type: number
                required:
                  - count
                  - timestamp
        default:
          description: ''
      tags:
        - example-tag
      summary: Stream Endpoint
      description: |2-

                Returns an async generator when used in the sdk

                - Uses server sent events
                - But also has a response schema
                

---
Let's break down what we need to implement:

1. The route is GET /stream with SSE streaming
2. It returns an object with `count` (number) and `timestamp` (number) properties
3. We need to use the existing `streamSSEResponse` function
4. We'll add a new method to the ExampleClient class
5. We'll create a specific type for the response data

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * GET /stream
   * @tags example-tag
   * @summary Stream Endpoint
   * @description Returns an async generator when used in the sdk
   * - Uses server sent events
   * - But also has a response schema
   */
  async *stream(): AsyncGenerator<{ count: number; timestamp: number }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/stream',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new ExampleError('Failed to start stream', {
        status: response.status,
        data: await response.json().catch(() => undefined),
      });
    }

    yield* streamSSEResponse(response);
  }
}

// ... existing code ...
```

The implementation:
1. Added a new `stream` method to ExampleClient
2. Method is async generator that yields objects with count and timestamp
3. Uses existing fetch method with proper headers for SSE
4. Handles error cases by throwing ExampleError
5. Uses existing streamSSEResponse function to handle the SSE stream
6. Includes proper JSDoc comments with route information