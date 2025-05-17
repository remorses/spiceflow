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
   * GET /users/{id}
   * @tags example-tag
   */
  async getUserById(id: string): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: `/users/${encodeURIComponent(id)}`,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Failed to fetch user', {
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
   * POST /users
   * @tags example-tag
   */
  async createUser(body: CreateUserRequestBody): Promise<CreateUserResponse> {
    try {
      const response = await this.fetch({
        method: 'POST',
        path: '/users',
        body,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ExampleError('Failed to create user', {
          status: response.status,
          data: errorData,
        })
      }

      return response.json()
    } catch (error) {
      if (error instanceof ExampleError) throw error
      throw new ExampleError('Network error', { status: 500 })
    }
  }
}

// this function should not be removed even if not used
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

// Type definitions
interface CreateUserRequestBody {
  name: string
  email: string
  age: number
}

interface CreateUserResponse {
  message: string
  data?: any
}
