```typescript
// POST /ratelimit.v1.RatelimitService/MultiRatelimit
// Tags: ratelimit
interface V1RatelimitMultiRatelimitRequestBody {
  ratelimits: Array<{
    identifier: string;
    limit: number;
    duration: number;
    cost?: number;
  }>;
}

interface SingleRatelimitResponse {
  current: number;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

interface V1RatelimitMultiRatelimitResponseBody {
  ratelimits: SingleRatelimitResponse[];
}

export class ExampleClient {
  // ... (existing code)

  async multiRatelimit(
    body: V1RatelimitMultiRatelimitRequestBody,
  ): Promise<V1RatelimitMultiRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to perform multi-ratelimit check', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}
```