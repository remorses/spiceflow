```typescript
/**
 * GET /v1/liveness
 * Liveness check
 * Tags: liveness
 */
export async function liveness(): Promise<V1LivenessResponseBody> {
  const response = await fetch(`${this.baseUrl}/v1/liveness`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    },
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
```