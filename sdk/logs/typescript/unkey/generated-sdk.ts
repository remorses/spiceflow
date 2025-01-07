import { EventSourceParserStream } from 'eventsource-parser/stream'

export class ExampleClient {
  private baseUrl: string
  token?: string
  constructor({ baseUrl = 'http://localhost:3000', token }) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async fetch<T = any>({
    method,
    path,
    query,
    body,
    headers: customHeaders = {},
  }: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    path: string
    query?: Record<string, string | number | boolean | null | undefined>
    body?: T
    headers?: Record<string, string>
  }): Promise<Response> {
    const url = new URL(path, this.baseUrl)

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.token ? `Bearer ${this.token}` : '',
      ...customHeaders,
    }

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }

    return fetch(url.toString(), options)
  }

  /**
   * POST /v0/events
   * @tags events
   * @summary Create events
   * @description Accept NDJSON payload of events and process them
   */
  async createEvents(
    payload: string
  ): Promise<V0EventsResponseBody | ValidationError | BaseError> {
    const response = await this.fetch({
      method: 'POST',
      path: '/v0/events',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
      body: payload,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Failed to create events', {
        status: response.status,
        data: error,
      });
    }

    return response.json();
  }

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

  // POST /ratelimit.v1.RatelimitService/Ratelimit - tags: ratelimit
  async ratelimit(
    request: V1RatelimitRatelimitRequestBody
  ): Promise<V1RatelimitRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body: request,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Failed to ratelimit', {
        status: response.status,
        data: error,
      });
    }

    return response.json();
  }

  /**
   * GET /v1/liveness
   * @tags liveness
   * @description This endpoint checks if the service is alive.
   */
  async liveness(): Promise<V1LivenessResponseBody> {
    const response = await this.fetch({
      method: 'GET',
      path: '/v1/liveness',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ExampleError(error.detail || 'Failed to check liveness', {
        status: response.status,
        data: error,
      })
    }

    return response.json()
  }

  // POST /v1/ratelimit.commitLease - ratelimit
  async commitLease(
    request: V1RatelimitCommitLeaseRequestBody
  ): Promise<void> {
    const response = await this.fetch({
      method: 'POST',
      path: '/v1/ratelimit.commitLease',
      body: request,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Failed to commit lease', {
        status: response.status,
        data: error,
      });
    }

    return;
  }

  // POST /vault.v1.VaultService/Decrypt - tags: vault
  async decrypt(
    request: V1DecryptRequestBody
  ): Promise<V1DecryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Decrypt',
      body: request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Failed to decrypt', {
        status: response.status,
        data: error
      });
    }

    return response.json();
  }

  // POST /vault.v1.VaultService/Encrypt - tags: vault
  async encrypt(request: V1EncryptRequestBody): Promise<V1EncryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Encrypt',
      body: request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Encryption failed', {
        status: response.status,
        data: error
      });
    }

    return response.json();
  }

  // POST /vault.v1.VaultService/EncryptBulk - Encrypt multiple pieces of data
  // Tags: vault
  async encryptBulk(
    request: V1EncryptBulkRequestBody
  ): Promise<V1EncryptBulkResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/EncryptBulk',
      body: request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ExampleError(error.detail || 'Failed to encrypt bulk data', {
        status: response.status,
        data: error
      });
    }

    return response.json();
  }
}

export class ExampleError extends Error {
  status: number
  data: any
  constructor(
    public error: string,
    { status, data }: { status: number; data?: any },
  ) {
    super(error)
    this.status = status
    this.data = data
  }
}

export async function* streamSSEResponse(
  response: Response,
): AsyncGenerator<SSEEvent> {
  const body = response.body
  if (!body) return

  const eventStream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream())

  let reader = eventStream.getReader()
  while (true) {
    const { done, value: event } = await reader.read()
    if (done) break
    if (event?.event === 'error') {
      throw new ExampleError(event.data, { status: 500 })
    }
    if (event) {
      try {
        yield JSON.parse(event.data)
      } catch (error) {}
    }
  }
}

interface SSEEvent {
  event: string
  data: any
  id?: string
}

// Type definitions
interface V0EventsResponseBody {
  $schema?: string;
  successful_rows: number;
  quarantined_rows: number;
}

interface ValidationError {
  requestId: string;
  detail: string;
  errors?: ValidationErrorDetail[];
  instance: string;
  status: number;
  title: string;
  type: string;
}

interface ValidationErrorDetail {
  location: string;
  message: string;
  fix?: string;
}

interface BaseError {
  requestId: string;
  detail: string;
  instance: string;
  status: number;
  title: string;
  type: string;
}

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

// Type declarations
interface V1LivenessResponseBody {
  $schema?: string
  message: string
}

interface V1RatelimitCommitLeaseRequestBody {
  lease: string;
  cost: number;
}

interface V1DecryptRequestBody {
  keyring: string;
  encrypted: string;
  $schema?: string;
}

interface V1DecryptResponseBody {
  plaintext: string;
  $schema?: string;
}

interface V1EncryptRequestBody {
  $schema?: string;
  data: string;
  keyring: string;
}

interface V1EncryptResponseBody {
  $schema?: string;
  encrypted: string;
  keyId: string;
}

interface V1EncryptBulkRequestBody {
  $schema?: string;
  data: string[];
  keyring: string;
}

interface V1EncryptBulkResponseBody {
  $schema?: string;
  encrypted: Encrypted[];
}

interface Encrypted {
  encrypted: string;
  keyId: string;
}








