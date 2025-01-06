```typescript
/**
 * GET /users/{id}
 * Tags: example-tag
 */
async getUserById(id: string): Promise<any> {
  try {
    const response = await this.fetch({
      method: 'GET',
      path: `/users/${id}`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ExampleError('Failed to fetch user', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  } catch (error) {
    if (error instanceof ExampleError) {
      throw error;
    }
    throw new ExampleError('An unexpected error occurred', {
      status: 500,
      data: error,
    });
  }
}
```