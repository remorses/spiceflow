```typescript
/**
 * POST /ratelimit.v1.RatelimitService/MultiRatelimit
 * Method: POST
 * Tags: ratelimit
 */
export class RatelimitService {
  private client: ExampleClient;

  constructor(client: ExampleClient) {
    this.client = client;
  }

  async multiRatelimit(
    requestBody: V1RatelimitMultiRatelimitRequestBody
  ): Promise<V1RatelimitMultiRatelimitResponseBody> {
    const response = await this.client.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to perform multi ratelimit', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}

// Type Definitions
interface V1RatelimitMultiRatelimitRequestBody {
  ratelimits: Item[];
}

interface Item {
  identifier: string;
  limit: number;
  duration: number;
  cost?: number;
}

interface V1RatelimitMultiRatelimitResponseBody {
  ratelimits: SingleRatelimitResponse[];
}

interface SingleRatelimitResponse {
  current: number;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}
```