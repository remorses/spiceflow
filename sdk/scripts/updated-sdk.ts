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

interface SSEEvent {
  event: string;
  data: any;
  id?: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface CreateUserResponse {
  message: string;
  data?: any;
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

  async take(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Request failed', {
          status: response.status,
          data: errorData,
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

  async *stream(): AsyncGenerator<{ count: number; timestamp: number }> {
    const response = await this.fetch({
      method: 'GET',
      path: '/stream',
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to fetch stream', {
        status: response.status,
        data: errorData,
      });
    }

    for await (const event of streamSSEResponse(response)) {
      if (event.event === 'data') {
        yield event.data;
      }
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: `/users/${id}`,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Failed to fetch user', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('An unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const response = await this.fetch<CreateUserRequest>({
        method: 'POST',
        path: '/users',
        body: userData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Failed to create user', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json() as Promise<CreateUserResponse>;
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('An unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  async getError(): Promise<any> {
    const path = `/error`;
    const method = 'GET';

    try {
      const response = await this.fetch({
        method,
        path,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Error occurred', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json().catch(() => null);
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }

  async getErrorWithSchema(): Promise<{ message: string }> {
    const path = `/errorWithSchema`;
    const method = 'GET';

    try {
      const response = await this.fetch({
        method,
        path,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ExampleError(errorData.message || 'An error occurred', {
          status: response.status,
          data: errorData,
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

  async uploadFile(file: string): Promise<any> {
    const path = '/upload';
    const headers = {
      'Content-Type': 'multipart/form-data',
      Authorization: this.token ? `Bearer ${this.token}` : '',
    };

    const formData = new FormData();
    formData.append('file', file);

    const url = new URL(path, this.baseUrl);

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
    };

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Failed to upload file', {
          status: response.status,
          data: errorData,
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

  async getOpenApiSchema(): Promise<any> {
    const path = '/openapi';
    const method = 'GET';

    try {
      const response = await this.fetch({
        method,
        path,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to fetch OpenAPI schema', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('An unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
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