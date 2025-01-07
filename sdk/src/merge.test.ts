import { describe, expect, it } from 'vitest'
import { mergeSDKOutputs } from './sdk'
import { OpenAPIV3 } from 'openapi-types'
import dedent from 'string-dedent'
describe(
  'mergeSDKOutputs, cursor apply',
  () => {
    it('should merge multiple SDK outputs into a single file', async () => {
      const previousSdkCode = dedent`
        export class ExampleClient {
            private baseUrl: string;
            field: string;
            constructor({ baseUrl = 'http://localhost:3000' }: { baseUrl?: string }) {
                this.baseUrl = baseUrl;
            }
            /**
             * Example method
             * @returns {string} A test message
             */
            async exampleMethod(): Promise<string> {
                return 'This is an example method';
            }
            private ratelimit: RatelimitService;

            /**
             * Get the ratelimit service instance
             */
            getRatelimitService(): RatelimitService {
                if (!this.ratelimit) {
                    this.ratelimit = new RatelimitService(this);
                }
                return this.ratelimit;
            }

            /**
             * Fetch wrapper with authentication and error handling
             */
            async fetch({ method, path, body }: { method: string; path: string; body?: any }): Promise<Response> {
                const response = await fetch(\`\${this.baseUrl}\${path}\`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: body ? JSON.stringify(body) : undefined,
                });
                return response;
            }

            /**
             * GET /health
             * @summary Check API health
             * @returns Health status
             */
            async getHealth(): Promise<{ status: string }> {
                const response = await this.fetch({
                    method: 'GET',
                    path: '/health'
                });
                if (!response.ok) {
                    throw new Error('Health check failed');
                }
                return response.json();
            }

            /**
             * POST /auth/login 
             * @summary Authenticate user
             * @param credentials User credentials
             * @returns Authentication token
             */
            async login(credentials: { username: string; password: string }): Promise<{ token: string }> {
                const response = await this.fetch({
                    method: 'POST',
                    path: '/auth/login',
                    body: credentials
                });
                if (!response.ok) {
                    throw new Error('Login failed');
                }
                return response.json();
            }

            /**
             * GET /users/{id}
             * @summary Get user by ID
             * @param id User ID
             * @returns User details
             */
            async getUserById(id: string): Promise<any> {
                const response = await this.fetch({
                    method: 'GET',
                    path: \`/users/\${id}\`
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch user');
                }
                return response.json();
            }

            /**
             * DELETE /users/{id}
             * @summary Delete user
             * @param id User ID
             */
            async deleteUser(id: string): Promise<void> {
                const response = await this.fetch({
                    method: 'DELETE',
                    path: \`/users/\${id}\`
                });
                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }
            }
        }
        `
      const outputs = [
        {
          title: 'Get Users route',
          code: dedent`
        Add this code to the class implementation:

        \`\`\`typescript

        /**
         * GET /users
         * @tags users
         * @summary Get all users
         * @returns List of users
         * @throws {Error} If the request fails
         */
        async getUsers(): Promise<any> {
            const response = await fetch(\`\${this.baseUrl}/users\`);
            if (!response.ok) {
            throw new Error('Failed to fetch users');
            }
            return response.json();
        }
        // ... existing code ...
        \`\`\`
        `,
        },
        {
          title: 'Create User',
          code: dedent`
        Here's how to add a getUsers method to the ExampleClient class:

        \`\`\`
        export class ExampleClient {
            // ... (existing code)

            async getUsers(): Promise<any> {
                const response = await fetch(\`\${this.baseUrl}/users\`);
                if (!response.ok) {
                throw new Error('Failed to fetch users');
                }
                return response.json();
            }

            /**
             * POST /users
             * @tags users
             * @summary Create a new user
             * @param user The user to create
             * @returns The created user
             * @throws {Error} If the request fails
             */
            async createUser(user: { name: string }): Promise<any> {
                const response = await fetch(\`\${this.baseUrl}/users\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
                });
                if (!response.ok) {
                throw new Error('Failed to create user');
                }
                return response.json();
            }
        }
        \`\`\`
        `,
        },
      ]

      const openApiSchema: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      }

      const result = await mergeSDKOutputs({
        outputs,
        previousSdkCode,
        openApiSchema,
      })

      expect(result.code).toMatchInlineSnapshot(`
        "export class ExampleClient {
            private baseUrl: string;
            field: string;
            constructor({ baseUrl = 'http://localhost:3000' }: { baseUrl?: string }) {
                this.baseUrl = baseUrl;
            }
            /**
             * Example method
             * @returns {string} A test message
             */
            async exampleMethod(): Promise<string> {
                return 'This is an example method';
            }
            private ratelimit: RatelimitService;

            /**
             * Get the ratelimit service instance
             */
            getRatelimitService(): RatelimitService {
                if (!this.ratelimit) {
                    this.ratelimit = new RatelimitService(this);
                }
                return this.ratelimit;
            }

            /**
             * Fetch wrapper with authentication and error handling
             */
            async fetch({ method, path, body }: { method: string; path: string; body?: any }): Promise<Response> {
                const response = await fetch(\`\${this.baseUrl}\${path}\`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: body ? JSON.stringify(body) : undefined,
                });
                return response;
            }

            /**
             * GET /health
             * @summary Check API health
             * @returns Health status
             */
            async getHealth(): Promise<{ status: string }> {
                const response = await this.fetch({
                    method: 'GET',
                    path: '/health'
                });
                if (!response.ok) {
                    throw new Error('Health check failed');
                }
                return response.json();
            }

            /**
             * POST /auth/login 
             * @summary Authenticate user
             * @param credentials User credentials
             * @returns Authentication token
             */
            async login(credentials: { username: string; password: string }): Promise<{ token: string }> {
                const response = await this.fetch({
                    method: 'POST',
                    path: '/auth/login',
                    body: credentials
                });
                if (!response.ok) {
                    throw new Error('Login failed');
                }
                return response.json();
            }

            /**
             * GET /users/{id}
             * @summary Get user by ID
             * @param id User ID
             * @returns User details
             */
            async getUserById(id: string): Promise<any> {
                const response = await this.fetch({
                    method: 'GET',
                    path: \`/users/\${id}\`
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch user');
                }
                return response.json();
            }

            /**
             * DELETE /users/{id}
             * @summary Delete user
             * @param id User ID
             */
            async deleteUser(id: string): Promise<void> {
                const response = await this.fetch({
                    method: 'DELETE',
                    path: \`/users/\${id}\`
                });
                if (!response.ok) {
                    throw new Error('Failed to delete user');
                }
            }

            /**
             * GET /users
             * @tags users
             * @summary Get all users
             * @returns List of users
             * @throws {Error} If the request fails
             */
            async getUsers(): Promise<any> {
                const response = await fetch(\`\${this.baseUrl}/users\`);
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                return response.json();
            }

            /**
             * POST /users
             * @tags users
             * @summary Create a new user
             * @param user The user to create
             * @returns The created user
             * @throws {Error} If the request fails
             */
            async createUser(user: { name: string }): Promise<any> {
                const response = await fetch(\`\${this.baseUrl}/users\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                });
                if (!response.ok) {
                    throw new Error('Failed to create user');
                }
                return response.json();
            }
        }

        "
      `)
    })
  },
  1000 * 100,
)
