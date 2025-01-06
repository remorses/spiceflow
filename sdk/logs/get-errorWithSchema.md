```typescript
/**
 * GET /errorWithSchema
 * Method: GET
 * Tags: example-tag
 * Description: Always throws an error for testing error handling
 */
async getErrorWithSchema(): Promise<{ message: string }> {
  const path = `/errorWithSchema`;
  const method = 'GET';

  try {
    const response = await this.fetch({
      method,
      path,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError(errorData.message || 'An error occurred', {
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