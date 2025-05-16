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

1. We need to add a new method to handle the GET /stream endpoint
2. The endpoint returns a stream of Server-Sent Events (SSE)
3. The response schema is defined with count (number) and timestamp (number) properties
4. We'll use the existing `streamSSEResponse` function to handle the streaming
5. We'll create a specific type for the stream response
6. We'll add proper error handling

Here's the implementation:

```typescript:client.ts
// ... existing code ...

export class ExampleClient {
  // ... existing code ...

  /**
   * GET /stream
   * Tags: example-tag
   * Returns an async generator when used in the sdk
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
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new ExampleError(error?.message || 'Failed to start stream', {
        status: response.status,
        data: error,
      })
    }

    yield* streamSSEResponse(response)
  }
}

// ... rest of existing code ...
```

This implementation:
1. Adds a new `stream` method that returns an async generator
2. Uses the existing fetch method with proper headers for SSE
3. Includes error handling for non-200 responses
4. Uses the existing streamSSEResponse function to handle the streaming
5. Returns properly typed stream events with count and timestamp properties
6. Maintains compatibility with both browser and Node.js environments