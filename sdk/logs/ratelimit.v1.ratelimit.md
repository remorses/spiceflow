```typescript:src/client.ts
// POST /ratelimit.v1.RatelimitService/Ratelimit - tags: ratelimit
async ratelimit(
  request: V1RatelimitRatelimitRequestBody
): Promise<V1RatelimitRatelimitResponseBody> {
  const response = await this.fetch({
    method: 'POST',
    path: '/ratelimit.v1.RatelimitService/Ratelimit',
    body: request
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ExampleError(error.detail || 'Failed to ratelimit', {
      status: response.status,
      data: error
    });
  }

  return response.json();
}

// Type definitions
interface V1RatelimitRatelimitRequestBody {
  cost?: number;
  duration: number;
  identifier: string;
  limit: number;
  lease?: Lease;
}

interface V1RatelimitRatelimitResponseBody {
  current: number;
  lease?: string;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

interface Lease {
  cost: number;
  timeout: number;
}
```