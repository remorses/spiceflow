```typescript
/**
 * GET /
 * Method: GET
 * Tags: None
 */
async function take(): Promise<any> {
  try {
    const response = await this.fetch({
      method: 'GET',
      path: '/',
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
```