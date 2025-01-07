```typescript
/**
 * GET /v1/liveness
 * Liveness check
 * Tags: liveness
 */
async function liveness(): Promise<V1LivenessResponseBody> {
  const response = await this.fetch({
    method: 'GET',
    path: '/v1/liveness',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ExampleError('Failed to check liveness', {
      status: response.status,
      data: errorData,
    });
  }

  return response.json();
}

// Type Definitions
interface V1LivenessResponseBody {
  $schema?: string;
  message: string;
}

// Add the method to the ExampleClient class
ExampleClient.prototype.liveness = liveness;
```