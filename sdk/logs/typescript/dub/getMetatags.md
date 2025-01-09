openapi: 3.0.3
info:
  title: Dub.co API
  description: Dub is link management infrastructure for companies to create marketing campaigns, link sharing features, and referral programs.
  version: 0.0.1
  contact:
    name: Dub.co Support
    email: support@dub.co
    url: https://dub.co/api
  license:
    name: AGPL-3.0 license
    url: https://github.com/dubinc/dub/blob/main/LICENSE.md
servers:
  - url: https://api.dub.co
    description: Production API
paths:
  /metatags:
    get:
      operationId: getMetatags
      x-speakeasy-name-override: get
      summary: Retrieve the metatags for a URL
      description: Retrieve the metatags for a URL.
      tags:
        - Metatags
      parameters:
        - in: query
          name: url
          description: The URL to retrieve metatags for.
          schema:
            type: string
            example: https://dub.co
            description: The URL to retrieve metatags for.
          required: true
      responses:
        '200':
          description: The retrieved metatags
          content:
            application/json:
              schema:
                type: object
                properties:
                  title:
                    type: string
                    nullable: true
                    description: The meta title tag for the URL.
                    example: Dub.co - Link Management for Modern Marketing Teams
                  description:
                    type: string
                    nullable: true
                    description: The meta description tag for the URL.
                    example: Dub.co is the open-source link management infrastructure ...
                  image:
                    type: string
                    nullable: true
                    description: The OpenGraph image for the URL.
                    example: https://assets.dub.co/thumbnail.jpg
                required:
                  - title
                  - description
                  - image

---
Let's break down the implementation step by step:

1. First, we need to define the response type for the metatags endpoint based on the OpenAPI schema
2. We'll create a method in the ExampleClient class that:
   - Takes a URL parameter as required by the API
   - Makes a GET request to /metatags
   - Handles the response and error cases
   - Returns the typed response
3. The method will use the existing fetch utility from the ExampleClient class
4. We'll add proper TypeScript types for both input and output

Here's the implementation:

```typescript:exampleClient.ts
export class ExampleClient {
  // ... existing code ...

  /**
   * GET /metatags
   * Retrieve the metatags for a URL
   * Tags: Metatags
   */
  async getMetatags(
    params: { url: string }
  ): Promise<{ title: string | null; description: string | null; image: string | null }> {
    try {
      const response = await this.fetch({
        method: 'GET',
        path: '/metatags',
        query: { url: params.url }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ExampleError('Failed to retrieve metatags', {
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
}

// ... existing ExampleError and streamSSEResponse code ...
```

The implementation includes:
- A strongly typed method that matches the OpenAPI specification
- Proper error handling using the existing ExampleError class
- Type-safe input and output
- Usage of the existing fetch utility
- Proper handling of the required URL parameter
- Nullable fields in the response type to match the OpenAPI schema