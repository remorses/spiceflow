```typescript
async getError(): Promise<any> {
  const path = `/error`;
  const method = 'GET';

  try {
    const response = await this.fetch({
      method,
      path,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ExampleError('Error occurred', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json().catch(() => null);
  } catch (error) {
    if (error instanceof ExampleError) {
      throw error;
    }
    throw new ExampleError('Network error', { status: 500 });
  }
}
```