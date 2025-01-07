```typescript:exampleClient.ts
// GET /users/{id} - example-tag
async getUserById(id: string): Promise<any> {
  try {
    const response = await this.fetch({
      method: 'GET',
      path: `/users/${id}`,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to fetch user', {
        status: response.status,
        data: errorData,
      });
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ExampleError) {
      throw error;
    }
    throw new ExampleError('Network error', { status: 500 });
  }
}
```