I'll add the MultiRatelimit method to the ExampleClient class with all required types.

```typescript:exampleClient.ts
// ... existing code ...

export interface Item {
  identifier: string;
  limit: number;
  duration: number;
  cost?: number;
}

export interface SingleRatelimitResponse {
  current: number;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

export interface V1RatelimitMultiRatelimitRequestBody {
  ratelimits: Item[];
}

export interface V1RatelimitMultiRatelimitResponseBody {
  ratelimits: SingleRatelimitResponse[];
}

// POST /ratelimit.v1.RatelimitService/MultiRatelimit - ratelimit
async multiRatelimit(
  body: V1RatelimitMultiRatelimitRequestBody
): Promise<V1RatelimitMultiRatelimitResponseBody> {
  const response = await this.fetch({
    method: 'POST',
    path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
    body
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ExampleError(error.detail || 'Failed to check ratelimits', {
      status: response.status,
      data: error
    });
  }

  return response.json();
}

// ... existing code ...
```