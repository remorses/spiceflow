import { EventSourceParserStream } from 'eventsource-parser/stream'
import * as types from './types'
import type {
  V1RatelimitMultiRatelimitRequestBody,
  V1RatelimitMultiRatelimitResponseBody,
  ValidationError,
  BaseError,
} from './types'

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
    body: types.V0EventsRequestBody,
    options?: { headers?: Record<string, string> }
  ): Promise<types.V0EventsResponseBody> {
    const headers = {
      'Content-Type': 'application/x-ndjson',
      ...options?.headers,
    }

    const response = await this.fetch({
      method: 'POST',
      path: '/v0/events',
      body,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new ExampleError(errorData.detail || 'Failed to create events', {
        status: response.status,
        data: errorData,
      })
    }

    return response.json()
  }

  /**
   * POST /ratelimit.v1.RatelimitService/MultiRatelimit
   * @tags ratelimit
   * @param body - The rate limits to check
   * @returns Promise<V1RatelimitMultiRatelimitResponseBody>
   * @throws {ExampleError} Will throw an error if the request fails
   */
  async multiRatelimit(
    body: V1RatelimitMultiRatelimitRequestBody,
  ): Promise<V1RatelimitMultiRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/MultiRatelimit',
      body,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new ExampleError('Request failed', {
        status: response.status,
        data: errorData,
      })
    }

    return response.json() as Promise<V1RatelimitMultiRatelimitResponseBody>
  }

  /**
   * POST /ratelimit.v1.RatelimitService/Ratelimit
   * Tags: ratelimit
   */
  async ratelimit(
    body: types.V1RatelimitRatelimitRequestBody
  ): Promise<types.V1RatelimitRatelimitResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/ratelimit.v1.RatelimitService/Ratelimit',
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (response.status === 400) {
        throw new ExampleError('Bad request', {
          status: response.status,
          data: errorData as types.ValidationError,
        });
      }
      if (response.status === 500) {
        throw new ExampleError('Internal server error', {
          status: response.status,
          data: errorData as types.BaseError,
        });
      }
      throw new ExampleError('Request failed', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.V1RatelimitRatelimitResponseBody>;
  }

  /**
   * @description This endpoint checks if the service is alive.
   * @route GET /v1/liveness
   * @tags liveness
   */
  async liveness(): Promise<types.V1LivenessResponseBody> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/v1/liveness',
      });

      if (!response.ok) {
        const errorData: types.BaseError = await response.json();
        throw new ExampleError(errorData.detail, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json() as Promise<types.V1LivenessResponseBody>;
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unknown error occurred', { status: 500 });
    }
  }

  /**
   * POST /v1/ratelimit.commitLease
   * @tags ratelimit
   * @param body - The request body containing lease and cost information
   * @throws {ExampleError} Will throw an error if the request fails (400 or 500 status)
   */
  async commitLease(body: types.V1RatelimitCommitLeaseRequestBody): Promise<void> {
    const response = await this.fetch({
      method: 'POST',
      path: '/v1/ratelimit.commitLease',
      body,
    })

    if (response.status === 204) {
      return
    }

    const errorData = await response.json().catch(() => null)
    if (response.status === 400) {
      throw new ExampleError('Validation Error', {
        status: response.status,
        data: errorData as types.ValidationError,
      })
    }
    if (response.status === 500) {
      throw new ExampleError('Server Error', {
        status: response.status,
        data: errorData as types.BaseError,
      })
    }

    throw new ExampleError('Unknown Error', {
      status: response.status,
      data: errorData,
    })
  }

  /**
   * POST /vault.v1.VaultService/Decrypt
   * @tags vault
   * @param body The request body containing encrypted data and keyring
   * @returns Promise resolving to decrypted plaintext
   * @throws {ExampleError} When the request fails
   */
  async decrypt(body: types.V1DecryptRequestBody): Promise<types.V1DecryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Decrypt',
      body,
    });

    if (!response.ok) {
      let errorData: types.BaseError | types.ValidationError;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new ExampleError('Failed to parse error response', {
          status: response.status,
        });
      }

      throw new ExampleError(errorData.detail, {
        status: response.status,
        data: errorData,
      });
    }

    return response.json() as Promise<types.V1DecryptResponseBody>;
  }

  /**
   * POST /vault.v1.VaultService/Encrypt
   * @tags vault
   * @param body - The encryption request
   * @returns The encrypted data
   * @throws {ExampleError} When the request fails
   */
  async encrypt(body: types.V1EncryptRequestBody): Promise<types.V1EncryptResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/Encrypt',
      body
    });

    if (!response.ok) {
      let errorData: types.BaseError | types.ValidationError;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new ExampleError('Failed to parse error response', { status: response.status });
      }

      throw new ExampleError(errorData.detail, {
        status: response.status,
        data: errorData
      });
    }

    return response.json() as Promise<types.V1EncryptResponseBody>;
  }

  /**
   * POST /vault.v1.VaultService/EncryptBulk
   * @tags vault
   * @param request The request body containing data to encrypt
   * @returns Promise containing the encrypted data
   * @throws {ExampleError} Will throw on 400 or 500 status codes
   */
  async encryptBulk(request: types.V1EncryptBulkRequestBody): Promise<types.V1EncryptBulkResponseBody> {
    const response = await this.fetch({
      method: 'POST',
      path: '/vault.v1.VaultService/EncryptBulk',
      body: request
    });

    if (!response.ok) {
      let errorData: types.BaseError | types.ValidationError;
      try {
        errorData = await response.json();
      } catch (error) {
        throw new ExampleError('Failed to parse error response', { status: response.status });
      }
      throw new ExampleError(errorData.detail, { status: response.status, data: errorData });
    }

    return response.json() as Promise<types.V1EncryptBulkResponseBody>;
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








