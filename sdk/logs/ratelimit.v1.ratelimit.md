export class RatelimitService {
  private client: ExampleClient;

  constructor(client: ExampleClient) {
    this.client = client;
  }

  async ratelimit(
    requestBody: V1RatelimitRatelimitRequestBody
  ): Promise<V1RatelimitRatelimitResponseBody> {
    const response = await this.client.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body: requestBody,
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

interface V1RatelimitRatelimitRequestBody {
  cost?: number;
  duration: number;
  identifier: string;
  lease?: Lease;
  limit: number;
}

interface Lease {
  cost: number;
  timeout: number;
}

interface V1RatelimitRatelimitResponseBody {
  current: number;
  lease?: string;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}