```typescript:exampleClient.ts
// GET /openapi
// Method: GET
// Tags: none
async getOpenAPI(): Promise<any> {
  try {
    const response = await this.fetch({
      method: 'GET',
      path: '/openapi'
    });

    if (!response.ok) {
      throw new ExampleError('Failed to fetch OpenAPI spec', {
        status: response.status,
        data: await response.json().catch(() => undefined)
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
```