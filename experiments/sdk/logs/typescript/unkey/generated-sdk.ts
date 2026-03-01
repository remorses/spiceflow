import { EventSourceParserStream } from 'eventsource-parser/stream'
import * as types from './components'

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

  // POST /v0/events
  // Tags: events
  async createEvent(
    body: string
  ): Promise<V0EventsResponseBody> {
    try {
      const response = await this.fetch<V0EventsRequestBody>({
        method: 'POST',
        path: '/v0/events',
        body,
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          throw new ExampleError('Validation Error', {
            status: 400,
            data: errorData as ValidationError,
          });
        } else {
          throw new ExampleError('Server Error', {
            status: response.status,
            data: errorData as BaseError,
          });
        }
      }

      return (await response.json()) as V0EventsResponseBody;
    } catch (error) {
      throw new ExampleError('Network Error', { status: 500, data: error });
    }
  }

  // POST /ratelimit.v1.RatelimitService/MultiRatelimit
  // Tags: ratelimit
  async multiRatelimit(
    body: types.v1RatelimitMultiRatelimitRequestBody
  ): Promise<types.v1RatelimitMultiRatelimitResponseBody> {
    const response = await this.fetch<types.v1RatelimitMultiRatelimitRequestBody>({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Error fetching multi ratelimit', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.v1RatelimitMultiRatelimitResponseBody>;
  }

  // POST /ratelimit.v1.RatelimitService/Ratelimit
  // Tags: ratelimit
  async ratelimit(
    body: types.v1RatelimitRatelimitRequestBody
  ): Promise<types.v1RatelimitRatelimitResponseBody> {
    const response = await this.fetch<types.v1RatelimitRatelimitRequestBody>({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError('Error occurred while fetching rate limit', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.v1RatelimitRatelimitResponseBody>;
  }

  // GET /v1/liveness
  // Summary: Liveness check
  // Tags: liveness
  async checkLiveness(): Promise<V1LivenessResponseBody> {
    const response = await this.fetch<V1LivenessResponseBody>({
      method: 'GET',
      path: '/v1/liveness',
    });

    if (!response.ok) {
      const errorData: BaseError = await response.json();
      throw new ExampleError(errorData.detail, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<V1LivenessResponseBody>;
  }

  // POST /v1/ratelimit.commitLease
  // Tags: ratelimit
  async commitLease(
    body: types.V1RatelimitCommitLeaseRequestBody
  ): Promise<void> {
    const response = await this.fetch({
      method: 'POST',
      path: '/v1/ratelimit.commitLease',
      body,
    });

    if (response.status === 204) {
      return; // No Content
    }

    if (response.status === 400) {
      const errorData: types.ValidationError = await response.json();
      throw new ExampleError(errorData.detail, {
        status: errorData.status,
        data: errorData,
      });
    }

    if (response.status === 500) {
      const errorData: types.BaseError = await response.json();
      throw new ExampleError(errorData.detail, {
        status: errorData.status,
        data: errorData,
      });
    }

    throw new Error('Unexpected response');
  }

  // POST /vault.v1.VaultService/Decrypt
  // Tags: vault
  async decrypt(
    requestBody: types.V1DecryptRequestBody
  ): Promise<types.V1DecryptResponseBody> {
    const response = await this.fetch<types.V1DecryptRequestBody>({
      method: 'POST',
      path: '/vault.v1.VaultService/Decrypt',
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = errorData as types.BaseError | types.ValidationError;
      throw new ExampleError(error.detail, {
        status: response.status,
        data: error,
      });
    }

    return response.json() as Promise<types.V1DecryptResponseBody>;
  }

  // POST /vault.v1.VaultService/Encrypt
  // Tags: vault
  async encrypt(
    body: types.v1EncryptRequestBody
  ): Promise<types.v1EncryptResponseBody> {
    try {
      const response = await this.fetch<types.v1EncryptRequestBody>({
        method: 'POST',
        path: '/vault.v1.VaultService/Encrypt',
        body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          throw new ExampleError('Validation Error', {
            status: response.status,
            data: errorData as types.ValidationError,
          });
        } else if (response.status === 500) {
          throw new ExampleError('Server Error', {
            status: response.status,
            data: errorData as types.BaseError,
          });
        }
        throw new ExampleError('Unknown Error', {
          status: response.status,
          data: errorData,
        });
      }

      return (await response.json()) as types.v1EncryptResponseBody;
    } catch (error) {
      throw new ExampleError('Request Failed', { status: 0, data: error });
    }
  }

  // POST /vault.v1.VaultService/EncryptBulk
  // Tags: vault
  async encryptBulk(
    body: types.v1EncryptBulkRequestBody
  ): Promise<types.v1EncryptBulkResponseBody> {
    const response = await this.fetch<types.v1EncryptBulkRequestBody>({
      method: 'POST',
      path: '/vault.v1.VaultService/EncryptBulk',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 400) {
        throw new ExampleError('Validation Error', {
          status: response.status,
          data: errorData as types.ValidationError,
        });
      } else if (response.status === 500) {
        throw new ExampleError('Server Error', {
          status: response.status,
          data: errorData as types.BaseError,
        });
      }
      throw new ExampleError('Unknown Error', {
        status: response.status,
        data: errorData,
      });
    }

    return (await response.json()) as types.v1EncryptBulkResponseBody;
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

// this function should not be removed even if not used
export async function* streamSSEResponse(
  response: Response,
): AsyncGenerator<any> {
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

// Type definitions for the new method
export interface CreateEventResponse extends V0EventsResponseBody {}

// Type definitions for the method
export interface MultiRatelimitRequestBody extends types.v1RatelimitMultiRatelimitRequestBody {}
export interface MultiRatelimitResponseBody extends types.v1RatelimitMultiRatelimitResponseBody {}

// Type declarations for the method
export interface RatelimitRequestBody extends types.v1RatelimitRatelimitRequestBody {}
export interface RatelimitResponseBody extends types.v1RatelimitRatelimitResponseBody {}

// Type definitions for the new method
export interface CommitLeaseResponse {
  // No response body expected for 204
}

// Type definitions for the method
export interface DecryptRequestBody extends types.V1DecryptRequestBody {}
export interface DecryptResponseBody extends types.V1DecryptResponseBody {}

// Type definitions for the new method
export interface EncryptRequestBody extends types.V1EncryptRequestBody {}
export interface EncryptResponseBody extends types.V1EncryptResponseBody {}








