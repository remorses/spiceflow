Since the `/errorWithSchema` route was deleted from the OpenAPI schema, we need to remove its implementation from the SDK. Here's the code that should be removed:

```typescript:example-client.ts
// ... existing code ...

  /**
   * GET /errorWithSchema
   * @tags example-tag
   * @description Always throws an error for testing error handling
   */
  async getErrorWithSchema(): Promise<{ message: string }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/errorWithSchema',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ExampleError('Request failed', {
        status: response.status,
        data: errorData,
      })
    }

    return response.json()
  }

// ... existing code ...
```

This method should be completely removed from the `ExampleClient` class as the route no longer exists in the API.