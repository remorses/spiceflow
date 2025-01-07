```typescript:exampleClient.ts
// POST /users - example-tag
async createUser(body: CreateUserRequest): Promise<CreateUserResponse> {
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

interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface CreateUserResponse {
  message: string;
  data?: any;
}
```