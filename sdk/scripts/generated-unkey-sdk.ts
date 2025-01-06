import { EventSourceParserStream } from 'eventsource-parser/stream';

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
}

export class ExampleError extends Error {
  status: number;
  data: any;

  constructor(public error: string, { status, data }: { status: number; data?: any }) {
    super(error);
    this.status = status;
    this.data = data;
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

// Type Definitions
interface V0EventsRequestBody {
  type: string;
}

interface V0EventsResponseBody {
  $schema?: string;
  successful_rows: number;
  quarantined_rows: number;
}

interface ValidationErrorDetail {
  location: string;
  message: string;
  fix?: string;
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

interface BaseError {
  requestId: string;
  detail: string;
  instance: string;
  status: number;
  title: string;
  type: string;
}

interface Item {
  identifier: string;
  limit: number;
  duration: number;
  cost?: number;
}

interface Lease {
  cost: number;
  timeout: number;
}

interface SingleRatelimitResponse {
  current: number;
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

interface V1RatelimitMultiRatelimitRequestBody {
  ratelimits: Item[];
}

interface V1RatelimitMultiRatelimitResponseBody {
  ratelimits: SingleRatelimitResponse[];
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

interface V1LivenessResponseBody {
  $schema?: string;
  message: string;
}

interface V1RatelimitCommitLeaseRequestBody {
  cost: number;
  lease: string;
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

// SDK Functions
export async function createEvents(
  client: ExampleClient,
  body: V0EventsRequestBody,
  headers?: Record<string, string>
): Promise<V0EventsResponseBody> {
  const response = await client.fetch<V0EventsRequestBody>({
    method: 'POST',
    path: '/v0/events',
    body,
    headers: {
      'Content-Type': 'application/x-ndjson',
      ...headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 400) {
      throw new ExampleError('Bad Request', {
        status: response.status,
        data: errorData as ValidationError,
      });
    } else if (response.status === 500) {
      throw new ExampleError('Internal Server Error', {
        status: response.status,
        data: errorData as BaseError,
      });
    } else {
      throw new ExampleError('Unknown Error', {
        status: response.status,
        data: errorData,
      });
    }
  }

  return response.json() as Promise<V0EventsResponseBody>;
}

export async function multiRatelimit(
  client: ExampleClient,
  body: V1RatelimitMultiRatelimitRequestBody,
): Promise<V1RatelimitMultiRatelimitResponseBody> {
  const response = await client.fetch({
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

export async function ratelimit(
  client: ExampleClient,
  body: V1RatelimitRatelimitRequestBody,
): Promise<V1RatelimitRatelimitResponseBody> {
  const response = await client.fetch({
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

export async function liveness(client: ExampleClient): Promise<V1LivenessResponseBody> {
  const response = await client.fetch({
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

export async function commitLease(
  client: ExampleClient,
  body: V1RatelimitCommitLeaseRequestBody,
  options?: { headers?: Record<string, string> }
): Promise<void> {
  const response = await client.fetch({
    method: 'POST',
    path: '/v1/ratelimit.commitLease',
    body,
    headers: options?.headers,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ExampleError(errorData.detail || 'Failed to commit lease', {
      status: response.status,
      data: errorData,
    });
  }

  return;
}

export async function decrypt(
  client: ExampleClient,
  body: V1DecryptRequestBody,
  options?: { headers?: Record<string, string> }
): Promise<V1DecryptResponseBody> {
  const response = await client.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/Decrypt',
    body,
    headers: options?.headers,
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

export async function encrypt(
  client: ExampleClient,
  body: V1EncryptRequestBody,
  options?: { headers?: Record<string, string> }
): Promise<V1EncryptResponseBody> {
  const response = await client.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/Encrypt',
    body,
    headers: options?.headers,
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

export async function encryptBulk(
  client: ExampleClient,
  body: V1EncryptBulkRequestBody,
  options?: { headers?: Record<string, string> }
): Promise<V1EncryptBulkResponseBody> {
  const response = await client.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/EncryptBulk',
    body,
    headers: options?.headers,
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