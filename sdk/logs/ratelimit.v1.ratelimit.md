```typescript
// POST /ratelimit.v1.RatelimitService/Ratelimit
// Method: POST
// Tags: ratelimit

interface V1RatelimitRatelimitRequestBody {
  cost?: number;
  duration: number;
  identifier: string;
  lease?: Lease;
  limit: number;
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

export class RatelimitClient extends ExampleClient {
  async ratelimit(
    body: V1RatelimitRatelimitRequestBody,
  ): Promise<V1RatelimitRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Ratelimit request failed', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}
```