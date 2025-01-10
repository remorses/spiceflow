import { EventSourceParserStream } from 'eventsource-parser/stream'
import * as types from './types'

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
   * @method GET /
   * @tags one
   */
  async take(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Network error', { status: 500 })
    }
  }

  /**
   * GET /stream
   * Tags: example-tag
   * Returns an async generator when used in the sdk
   * - Uses server sent events
   * - But also has a response schema
   */
  async *stream(): AsyncGenerator<{ count: number; timestamp: number }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/stream',
      headers: {
        Accept: 'text/event-stream',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      throw new ExampleError(error?.message || 'Failed to start stream', {
        status: response.status,
        data: error,
      })
    }

    yield* streamSSEResponse(response)
  }

  /**
   * GET /users/{id}
   * @tags example-tag
   * @param id - The user ID
   * @returns Promise<any>
   */
  async getUserById(id: string): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: `/users/${encodeURIComponent(id)}`
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to fetch user', {
          status: response.status,
          data: errorData
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }

  /**
   * POST /users
   * @tags users
   */
  async createUser(body: { name: string; email: string; age: number }): Promise<{ message: string }> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/users',
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to create user', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error while creating user', {
        status: 500,
        data: error,
      });
    }
  }

  /**
   * GET /error
   * Tags: example-tag
   * Summary: Error Endpoint
   * Description: Always throws an error for testing error handling
   */
  async getError(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/error',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Network error', { status: 500, data: error })
    }
  }

  /**
   * GET /errorWithSchema
   * Tags: example-tag
   * Description: Always throws an error for testing error handling
   */
  async errorWithSchema(): Promise<{ message: string }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/errorWithSchema',
    })

    if (!response.ok) {
      let errorData: any
      try {
        errorData = await response.json()
      } catch (error) {
        errorData = await response.text()
      }
      throw new ExampleError('Request failed', {
        status: response.status,
        data: errorData,
      })
    }

    return response.json()
  }

  /**
   * POST /upload
   * @tags upload
   * @param file - Base64 encoded file data
   */
  async uploadFile(file: string): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([Buffer.from(file, 'base64')], { type: 'application/octet-stream' });
    formData.append('file', blob);

    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/upload',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Upload failed', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) throw error;
      throw new ExampleError('Network error', { status: 500 });
    }
  }

  /**
   * GET /openapi
   * @tags openapi
   */
  async getOpenApi(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/openapi',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error
      }
      throw new ExampleError('Network error', { status: 500 })
    }
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








