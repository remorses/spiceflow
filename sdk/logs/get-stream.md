```typescript
/**
 * GET /stream
 * Method: GET
 * Tags: example-tag
 * Summary: Stream Endpoint
 * Description: Returns an async generator when used in the SDK. Uses server sent events and has a response schema.
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
    const errorData = await response.json().catch(() => ({}));
    throw new ExampleError('Failed to fetch stream', {
      status: response.status,
      data: errorData,
    });
  }

  for await (const event of streamSSEResponse(response)) {
    if (event.event === 'data') {
      yield event.data;
    }
  }
}
```