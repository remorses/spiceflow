import { EventSourceParserStream } from 'eventsource-parser/stream';

export class ExampleError extends Error {
  status: number;
  data: any;
  constructor(public error: string, { status, data }: { status: number; data?: any }) {
    super(error);
    this.status = status;
    this.data = data;
  }
}

export interface V0EventsResponseBody {
  $schema?: string;
  successful_rows: number;
  quarantined_rows: number;
}

export interface ValidationErrorDetail {
  location: string;
  message: string;
  fix?: string;
}

export interface ValidationError {
  requestId: string;
  detail: string;
  errors?: ValidationErrorDetail[];
  instance: string;
  status: number;
  title: string;
  type: string;
}

export interface BaseError {
  requestId: string;
  detail: string;
  instance: string;
  status: number;
  title: string;
  type: string;
}

export interface Item {
  identifier: string;
  limit: number;
  duration: number;
  cost?: number;
}

export interface Lease {
  cost: number;
  timeout: number;
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

export interface V1RatelimitRatelimitRequestBody {
  cost?: number;
  duration: number;
  identifier: string;
  lease?: Lease;
  limit: number;
}

export interface V1RatelimitRatelimitResponseBody {
  current: number;
  lease?: string;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

export interface V1LivenessResponseBody {
  $schema?: string;
  message: string;
}

export interface V1DecryptRequestBody {
  keyring: string;
  encrypted: string;
  $schema?: string;
}

export interface V1DecryptResponseBody {
  plaintext: string;
  $schema?: string;
}

export interface V1EncryptRequestBody {
  $schema?: string;
  data: string;
  keyring: string;
}

export interface V1EncryptResponseBody {
  $schema?: string;
  encrypted: string;
  keyId: string;
}

export interface V1EncryptBulkRequestBody {
  $schema?: string;
  data: string[];
  keyring: string;
}

export interface V1EncryptBulkResponseBody {
  $schema?: string;
  encrypted: Encrypted[];
}

export interface Encrypted {
  encrypted: string;
  keyId: string;
}

export class ExampleClient {
  private baseUrl: string;
  token?: string;

  constructor({ baseUrl = 'http://localhost:3000', token }: { baseUrl?: string; token?: string }) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async fetch<T = any>({
    method,
    path,
    query,
    body,
    headers: customHeaders = {},
  }: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: T;
    headers?: Record<string, string>;
  }): Promise<Response> {
    const url = new URL(path, this.baseUrl);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.token ? `Bearer ${this.token}` : '',
      ...customHeaders,
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    return fetch(url.toString(), options);
  }

  async createEvents(body: string): Promise<V0EventsResponseBody> {
    const headers = {
      'Content-Type': 'application/x-ndjson',
    };

    const response = await this.fetch({
      method: 'POST',
      path: '/v0/events',
      body,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to create events', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  async multiRatelimit(body: V1RatelimitMultiRatelimitRequestBody): Promise<V1RatelimitMultiRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to perform multi ratelimit check', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<V1RatelimitMultiRatelimitResponseBody>;
  }

  async ratelimitV1Ratelimit(body: V1RatelimitRatelimitRequestBody): Promise<V1RatelimitRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to perform rate limit check', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  async liveness(): Promise<V1LivenessResponseBody> {
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

  async commitLease(body: V1RatelimitCommitLeaseRequestBody): Promise<void> {
    const response = await this.fetch({
      method: 'POST',
      path: '/v1/ratelimit.commitLease',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to commit lease', {
        status: response.status,
        data: errorData,
      });
    }
  }

  async decrypt(body: V1DecryptRequestBody): Promise<V1DecryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Decrypt',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to decrypt data', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  async encrypt(body: V1EncryptRequestBody): Promise<V1EncryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Encrypt',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to encrypt data', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }

  async encryptBulk(request: V1EncryptBulkRequestBody): Promise<V1EncryptBulkResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/EncryptBulk',
      body: request,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Failed to encrypt bulk data', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}

export async function* streamSSEResponse(response: Response): AsyncGenerator<SSEEvent> {
  const body = response.body;
  if (!body) return;

  const eventStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  let reader = eventStream.getReader();
  while (true) {
    const { done, value: event } = await reader.read();
    if (done) break;
    if (event?.event === 'error') {
      throw new ExampleError(event.data, { status: 500 });
    }
    if (event) {
      try {
        yield JSON.parse(event.data);
      } catch (error) {}
    }
  }
}

interface SSEEvent {
  event: string;
  data: any;
  id?: string;
}