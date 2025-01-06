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
    const url = new URL(`${this.baseUrl}${path}`);

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
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Failed to fetch data', {
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

  async *stream(): AsyncGenerator<StreamResponse, void, unknown> {
    const url = new URL(`${this.baseUrl}/stream`);
    const headers = {
      Authorization: this.token ? `Bearer ${this.token}` : '',
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ExampleError('Failed to fetch stream', {
        status: response.status,
        data: errorData,
      });
    }

    if (!response.body) {
      throw new ExampleError('No response body', { status: response.status });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonString = line.slice(6).trim();
          if (jsonString) {
            try {
              const data = JSON.parse(jsonString) as StreamResponse;
              yield data;
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    }
  }

  async getUserById(id: string): Promise<any> {
    const path = `/users/${id}`;

    try {
      const response = await this.fetch({
        method: 'GET',
        path,
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

  async createUser(body: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const response = await this.fetch<CreateUserRequest>({
        method: 'POST',
        path: '/users',
        body,
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
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/error',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('API call failed', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  async getErrorWithSchema(): Promise<{ message: string }> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/errorWithSchema',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
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
      throw new ExampleError('An unexpected error occurred', {
        status: 500,
        data: error,
      });
    }
  }

  async uploadFile({
    file,
  }: {
    file: string; // Base64 encoded file
  }): Promise<any> {
    const path = "/upload";
    const method = "POST";

    const formData = new FormData();
    const blob = new Blob([Buffer.from(file, "base64")], {
      type: "application/octet-stream",
    });
    formData.append("file", blob);

    const headers = {
      Authorization: this.token ? `Bearer ${this.token}` : "",
    };

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError("File upload failed", {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError("Network error during file upload", {
        status: 0,
        data: null,
      });
    }
  }

  async getOpenApiSchema(): Promise<any> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/openapi',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
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

export class ExampleError extends Error {
  status: number;
  data: any;

  constructor(
    public error: string,
    { status, data }: { status: number; data?: any },
  ) {
    super(error);
    this.status = status;
    this.data = data;
  }
}

export interface StreamResponse {
  count: number;
  timestamp: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

export interface CreateUserResponse {
  message: string;
  data?: any; // Optional field since the schema allows for additional properties
}