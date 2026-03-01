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
To implement the `GET /metatags` route in the existing SDK, we will follow these steps:

1. **Define the Input and Output Types**: We will create a type for the input parameters (the URL) and another for the response (the metatags).

2. **Add the Method**: We will create a method in the `ExampleClient` class that uses the existing `fetch` method to make the API call.

3. **Handle Serialization**: The method will handle the serialization of the request and response.

4. **Error Handling**: We will ensure that any errors during the fetch are properly caught and handled.

5. **Commenting**: We will add a comment above the method to indicate the route path, method, and tags.

Here’s the code snippet to be added to the `./client.ts` file:

```typescript:client.ts
  // GET /metatags - Retrieve the metatags for a URL
  async getMetatags(
    url: string
  ): Promise<{
    title: string | null;
    description: string | null;
    image: string | null;
  }> {
    const response = await this.fetch<{ url: string }>({
      method: 'GET',
      path: '/metatags',
      query: { url },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExampleError('Failed to retrieve metatags', {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
```

### Type Declarations
At the end of the snippet, we will declare the types used in the method:

```typescript:client.ts
declare global {
  type MetatagsResponse = {
    title: string | null;
    description: string | null;
    image: string | null;
  };
}
```

This implementation ensures that the method is fully typed, handles errors, and is compatible with both Node.js and browser environments.