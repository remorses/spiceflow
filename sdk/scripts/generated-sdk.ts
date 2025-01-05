export class ExampleClient {
import { EventStream } from './event-stream';
export type User = {
export class ExampleClient {
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

 async *stream(): AsyncGenerator<StreamResponse, void, unknown> {
 const response = await this.fetch({
 method: 'GET',
 path: '/stream',
 });

 if (!response.ok) {
 throw new ExampleError('Failed to fetch stream', {
 status: response.status,
 data: await response.json(),
 });
 }

 const eventStream = new EventStream(response);
 for await (const event of eventStream) {
 yield JSON.parse(event.data) as StreamResponse;
 }
 }

 async getUser(id: string): Promise<any> {
 const response = await this.fetch({
 method: 'GET',
 path: `/users/${id}`,
 });

 if (!response.ok) {
 throw new ExampleError('Failed to fetch user', {
 status: response.status,
 data: await response.json(),
 });
 }

 return response.json();
 }

 async createUser(user: User): Promise<CreateUserResponse> {
 const response = await this.fetch({
 method: 'POST',
 path: '/users',
 body: user,
 });

 if (!response.ok) {
 throw new ExampleError('Failed to create user', {
 status: response.status,
 data: await response.json(),
 });
 }

 return response.json();
 }

 async uploadFile(file: string): Promise<any> {
 const response = await this.fetch({
 method: 'POST',
 path: '/upload',
 headers: {
 'Content-Type': 'multipart/form-data',
 },
 body: { file },
 });

 if (!response.ok) {
 throw new ExampleError('Failed to upload file', {
 status: response.status,
 data: await response.json(),
 });
 }

 return response.json();
 }

 async triggerError(): Promise<any> {
 const response = await this.fetch({
 method: 'GET',
 path: '/error',
 });

 if (!response.ok) {
 throw new ExampleError('Failed to trigger error', {
 status: response.status,
 data: await response.json(),
 });
 }

 return response.json();
 }

 async triggerErrorWithSchema(): Promise<ErrorResponse> {
 const response = await this.fetch({
 method: 'GET',
 path: '/errorWithSchema',
 });

 if (!response.ok) {
 throw new ExampleError('Failed to trigger error with schema', {
 status: response.status,
 data: await response.json(),
 });
 }

 return response.json();
 }
}

 name: string;
 email: string;
 age: number;
};

export type CreateUserResponse = {
 message: string;
 data: any;
};

export type StreamResponse = {
 count: number;
 timestamp: number;
};

export type ErrorResponse = {
 message: string;
};


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
