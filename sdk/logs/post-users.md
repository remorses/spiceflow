```typescript
interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface CreateUserResponse {
  message: string;
  data?: any;
}

/**
 * POST /users
 * Method: POST
 * Tags: example-tag
 * 
 * Creates a new user with the provided details.
 * 
 * @param userData - The user data to create.
 * @returns A promise that resolves to the created user response.
 */
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
```