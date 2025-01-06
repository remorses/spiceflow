Here is the implementation for the `POST /users` route in the TypeScript SDK. This method will handle the creation of a new user, including request/response serialization, error handling, and type definitions.

```typescript
// Type Definitions
interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface CreateUserResponse {
  message: string;
  data?: any;
}

// Method Implementation
export class ExampleClient {
  // ... (existing code)

  /**
   * Create a new user.
   * @param userData - The user data to create.
   * @returns A promise resolving to the response data.
   * @throws {ExampleError} If the request fails.
   */
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const response = await this.fetch({
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

      return await response.json();
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
```

### Explanation:
1. **Type Definitions**:
   - `CreateUserRequest`: Defines the structure of the request body for creating a user. It includes `name`, `email`, and `age` fields, all of which are required.
   - `CreateUserResponse`: Defines the structure of the response from the API. It includes a `message` field (required) and an optional `data` field.

2. **Method Implementation**:
   - The `createUser` method takes a `CreateUserRequest` object as input and returns a `Promise<CreateUserResponse>`.
   - It uses the `fetch` method (already implemented in the `ExampleClient` class) to send a `POST` request to the `/users` endpoint.
   - The request body is serialized as JSON.
   - If the response is not successful (`!response.ok`), it throws an `ExampleError` with the status code and any error data returned by the API.
   - If the request is successful, it parses and returns the JSON response.

3. **Error Handling**:
   - Errors are caught and rethrown as `ExampleError` to ensure consistent error handling across the SDK.
   - If an unexpected error occurs (e.g., network issues), it is wrapped in an `ExampleError` with a status code of `500`.

### Usage Example:
```typescript
const client = new ExampleClient({ baseUrl: 'https://api.com', token: 'your-jwt-token' });

const userData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  age: 30,
};

client.createUser(userData)
  .then(response => console.log('User created:', response))
  .catch(error => console.error('Error creating user:', error));
```

This implementation is fully typed, works in both Node.js and browser environments, and adheres to the OpenAPI schema provided.