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
Let me break down the implementation step by step:

1. First, we need to define the response type for the metatags endpoint since it's not defined with a ref in the OpenAPI schema
2. We'll create a new class method `get_metatags` in the `ExampleClientAsync` class
3. The method will:
   - Take a required URL parameter
   - Make a GET request to the /metatags endpoint
   - Handle the response and error cases
   - Return the typed response
4. We'll use the existing `fetch` method for making the API call
5. We'll add proper type hints and documentation

Here's the implementation:

```python
# ... existing imports ...
from typing import TypedDict

class MetatagsResponse(TypedDict):
    """Response type for the metatags endpoint"""
    title: Optional[str]
    description: Optional[str]
    image: Optional[str]

class ExampleClientAsync:
    # ... existing code ...

    # GET /metatags
    # Tags: Metatags
    async def get_metatags(self, url: str) -> MetatagsResponse:
        """Retrieve the metatags for a URL
        
        Args:
            url: The URL to retrieve metatags for
            
        Returns:
            MetatagsResponse: Dictionary containing title, description, and image
            
        Raises:
            ExampleError: If the API request fails
        """
        response = await self.fetch(
            method="GET",
            path="/metatags",
            query={"url": url}
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                f"Failed to get metatags: {response.status}",
                status=response.status,
                data=error_data
            )
            
        return await response.json()
```

The code adds:
1. A new `MetatagsResponse` type using `TypedDict` to represent the response structure
2. A new `get_metatags` method with proper type hints and documentation
3. Error handling that uses the existing `ExampleError` class
4. Proper request construction using the existing `fetch` method
5. Response parsing with error handling for non-200 status codes