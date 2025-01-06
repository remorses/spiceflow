old_str: export class ExampleClient
new_str:
```ts
export class ExampleClient {
  private baseUrl: string
  token?: string
  constructor({ baseUrl = 'https://api.com', token }: { baseUrl?: string; token?: string }) {
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
    const url = new URL(`${this.baseUrl}${path}`)

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

  async *stream(path: string, query?: Record<string, string | number | boolean | null | undefined>) {
    const response = await this.fetch({ method: 'GET', path, query })
    if (!response.ok) {
      throw new ExampleError('Failed to fetch stream', { status: response.status })
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ExampleError('Failed to get reader', { status: response.status })
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield new TextDecoder().decode(value)
    }
  }
}

export namespace ExampleTag {
  export async function getUsers(id: string): Promise<Response> {
    return new ExampleClient({}).fetch({ method: 'GET', path: `/users/${id}` })
  }

  export async function createUser(body: { name: string; email: string; age: number }): Promise<Response> {
    return new ExampleClient({}).fetch({ method: 'POST', path: '/users', body })
  }

  export async function getError(): Promise<Response> {
    return new ExampleClient({}).fetch({ method: 'GET', path: '/error' })
  }

  export async function getErrorWithSchema(): Promise<Response> {
    return new ExampleClient({}).fetch({ method: 'GET', path: '/errorWithSchema' })
  }

  export async function uploadFile(file: string): Promise<Response> {
    const formData = new FormData()
    formData.append('file', file)
    return new ExampleClient({}).fetch({ method: 'POST', path: '/upload', body: formData, headers: { 'Content-Type': 'multipart/form-data' } })
  }
}

export namespace One {
  export async function take(): Promise<Response> {
    return new ExampleClient({}).fetch({ method: 'GET', path: '/' })
  }
}

export namespace Stream {
  export async function *stream(): AsyncGenerator<string, void, unknown> {
    const client = new ExampleClient({})
    yield* client.stream('/stream')
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
```
