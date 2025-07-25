# spiceflow

## 1.17.4

### Patch Changes

- Softer type for handler return type, allow Cloudflare Response

## 1.17.3

### Patch Changes

- 268ba47: Add x-spiceflow-agent header to client requests to identify requests coming from the Spiceflow client. This header is set to 'spiceflow-client' for all requests made through the createSpiceflowClient function.

  Add `disableSuperJsonUnlessRpc` option to Spiceflow constructor. When set to `true`, superjson serialization is only applied to responses when the request includes the `x-spiceflow-agent: spiceflow-client` header. This allows you to disable superjson for regular HTTP requests while keeping it enabled for RPC clients. In a future major version, this will become the default behavior. When a parent app has this flag set to `true`, all child apps mounted with `.use()` will inherit this setting.

  Convert `superjsonSerialize` and `turnHandlerResultIntoResponse` from standalone functions to private methods of the Spiceflow class. This improves encapsulation and allows these methods to access instance properties like the `disableSuperJsonUnlessRpc` flag.

## 1.17.2

### Patch Changes

- Add resources to the server

## 1.17.1

### Patch Changes

- Fix safePath not working for .route

## 1.17.0

### Minor Changes

- Remove `path` parameter from `addMcpTools()` function and make `ignorePaths` required. Users should now pass an array of paths to ignore directly instead of a single path. Example usage:

  ```ts
  await addMcpTools({
    mcpServer,
    app,
    ignorePaths: ['/sse', '/mcp'],
  })
  ```

## 1.16.1

### Patch Changes

- Improve MCP server initialization by adding explicit capabilities registration and cleaning up code formatting. The `mcpServer.server.registerCapabilities()` call ensures proper MCP server setup with tools and resources capabilities.

## 1.16.0

### Minor Changes

- 4e2a0e6: Make route method field optional with `*` as default. Routes without an explicit `method` field now listen on all HTTP methods instead of requiring a method to be specified. This change simplifies route creation for catch-all handlers.

  **Before:**

  ```typescript
  app.route({
    method: 'GET', // required
    path: '/api/users',
    handler: () => 'users',
  })
  ```

  **After:**

  ```typescript
  // Method is now optional, defaults to '*' (all methods)
  app.route({
    path: '/api/users',
    handler: () => 'users',
  })

  // Explicit method still works
  app.route({
    method: 'GET',
    path: '/api/users',
    handler: () => 'users',
  })
  ```

## 1.15.1

### Patch Changes

- Add support for `*` wildcard in route method field to listen on all HTTP methods. When using `method: '*'` in the route configuration, the route will respond to all HTTP methods (GET, POST, PUT, DELETE, etc.). This provides a convenient way to create catch-all routes without having to specify each method individually.

  ```typescript
  app.route({
    method: '*',
    path: '/api/*',
    handler: ({ request }) => ({ method: request.method }),
  })
  ```

## 1.15.0

### Minor Changes

- Simplify addMcpTools API and make path parameter required. The addMcpTools function now always adds the OpenAPI route without checking if it exists, uses parameters directly instead of fetching from \_mcp_config route, and requires the path parameter to be explicitly provided. This makes the API more predictable and straightforward to use.

- Enable addMcpTools to work without mcp() plugin. The addMcpTools function now automatically adds the required OpenAPI and config routes (`/_mcp_openapi` and `/_mcp_config`) if they don't already exist, allowing it to work with any Spiceflow app even without the mcp() plugin. This makes it easier to integrate MCP tools into existing applications.

## 1.14.2

### Patch Changes

- Fix McpServer API usage by accessing setRequestHandler through the server property. The McpServer class changed its API and no longer exposes setRequestHandler directly - it must be accessed via mcpServer.server.setRequestHandler().
- Add test for addMcpTools function and update types. The addMcpTools function now properly types its parameters with McpServer from @modelcontextprotocol/sdk, ensuring better type safety when integrating external MCP servers with Spiceflow applications.

## 1.14.1

### Patch Changes

- Add `addMcpTools` helper function that configures MCP tools for an existing server and Spiceflow app. This provides a convenient way to add Spiceflow route tools to an existing MCP server instance.

  ```ts
  const mcpServer = await addMcpTools({ mcpServer, app })
  ```

## 1.14.0

### Minor Changes

- The `listen` and `listenForNode` methods now return an object with `{port, server}` instead of just the server instance. The port field contains the actual listening port, which is especially useful when using port 0 for random port assignment.

  ```ts
  // Before
  const server = await app.listen(3000)

  // After
  const { port, server } = await app.listen(3000)
  console.log(`Server listening on port ${port}`)

  // Useful with port 0 for random port
  const { port, server } = await app.listen(0)
  console.log(`Server assigned random port ${port}`)
  ```

### Patch Changes

- 37c3f7b: Add path parameter to onError handler and validate error status codes. The onError handler now receives the request path where the error occurred, making it easier to debug and log errors with context. Additionally, error status codes are now validated to ensure they are valid HTTP status codes (100-599), defaulting to 500 for invalid values. The error status resolution now also supports `statusCode` as a fallback when `status` is not present.

  ```typescript
  // Before
  app.onError(({ error, request }) => {
    console.log('Error occurred', error)
    return new Response('Error', { status: 500 })
  })

  // After
  app.onError(({ error, request, path }) => {
    console.log(`Error occurred at ${path}`, error)
    return new Response('Error', { status: 500 })
  })
  ```

- d4f555c: Fix duplicate base path handling in nested Spiceflow apps. The `joinBasePaths` method now properly handles cases where parent paths are prefixes of child paths, preventing duplicate path segments from being concatenated. This ensures that nested Spiceflow instances with overlapping base paths generate correct URLs.

## 1.13.3

### Patch Changes

- Add path parameter to onError handler and validate error status codes. The onError handler now receives the request path where the error occurred, making it easier to debug and log errors with context. Additionally, error status codes are now validated to ensure they are valid HTTP status codes (100-599), defaulting to 500 for invalid values.

  ```typescript
  // Before
  app.onError(({ error, request }) => {
    console.log('Error occurred', error)
    return new Response('Error', { status: 500 })
  })

  // After
  app.onError(({ error, request, path }) => {
    console.log(`Error occurred at ${path}`, error)
    return new Response('Error', { status: 500 })
  })
  ```

## 1.13.2

### Patch Changes

- move the request check at runtime instead of type

## 1.13.1

### Patch Changes

- Fix types because of an issue with array method params

## 1.13.0

### Minor Changes

- Add waitUntil

## 1.12.3

### Patch Changes

- .request is not allowed for GET routes

## 1.12.2

### Patch Changes

- 915f7d9: query type has values always defined, no optional keys

## 1.12.1

### Patch Changes

- app.safePath('/posts/_', { '_': 'some/key' }) support

## 1.12.0

### Minor Changes

- Add this type inside handlers to reference the app

## 1.11.3

### Patch Changes

- Fix type safety for .route and methods on client

## 1.11.2

### Patch Changes

- Fix support for Cloudflare without node, fix ./\_node-server exports

## 1.11.1

### Patch Changes

- Fix support for request to pass schema

## 1.11.0

### Minor Changes

- 7da7fb9: Deprecate body, use request instead. It aligns better with request reponse
- fe3c152: Added .route

### Patch Changes

- fe3c152: Fix missing package.json package

## 1.10.1

### Patch Changes

- Disable exposeHeaders in cors by default

## 1.10.0

### Minor Changes

- add support for zod v4

## 1.9.1

### Patch Changes

- return parsed schema value if defined

## 1.9.0

### Minor Changes

- Use @standard-schema/spec, remove ajv, works on Cloudflare workers

## 1.8.0

### Minor Changes

- Allow passing state as second arg to handle.

## 1.7.2

### Patch Changes

- Fix Next.js usage, Next.js is so retarded it manages to fuck up Readable.toWeb somehow

## 1.7.1

### Patch Changes

- Use writeHead in handleNode

## 1.7.0

### Minor Changes

- Add handleNode method

## 1.6.2

### Patch Changes

- 4874fc4: Async generator always return a sse stream, even if they have only one return

## 1.6.1

### Patch Changes

- Disable credentials include by default, casues many issues with CORS

## 1.6.0

### Minor Changes

- Pass credentials include by default in spiceflow client

### Patch Changes

- Fix isAsyncIterable

## 1.5.1

### Patch Changes

- df08dbe: Changed json schema additional strategy to strict

## 1.5.0

### Minor Changes

- Add superjson support

## 1.4.1

### Patch Changes

- ef7eae5: handle case where createClient returns a promise and await calls .then on it

## 1.4.0

### Minor Changes

- 22e6320: stop async generators on abort, ping the client with \n every 10 seconds

## 1.3.0

### Minor Changes

- 82a9598: Cache cors OPTIONS responses

## 1.2.0

### Minor Changes

- Errors are now JSON object responses, added mcp plugin to add model context protocol support, added x-fern types for openapi, added support for response schema in async generator routes

## 1.1.18

### Patch Changes

- Fix type inference when nothing is returned from route

## 1.1.17

### Patch Changes

- Fix ReplaceBlobWithFiles

## 1.1.16

### Patch Changes

- Removed bun types references, fix type inference

## 1.1.15

### Patch Changes

- Fix trailing slashes problems, fix index route with base path

## 1.1.14

### Patch Changes

- Run middleware on errors

## 1.1.13

### Patch Changes

- Changed some client type names

## 1.1.12

### Patch Changes

- handle promises responses correctly

## 1.1.11

### Patch Changes

- FIx instanceof Response again for all cases

## 1.1.10

### Patch Changes

- Fix case where response is not instance of Response, in cases where stupid Remix polyfills response because they are retarded

## 1.1.9

### Patch Changes

- Fix URL invalid in Remix

## 1.1.8

### Patch Changes

- Fix request getting always aborted in Nodejs, fix Nodejs listener for POST requests, fix middleware not setting result Response in some cases

## 1.1.7

### Patch Changes

- Fix type for middleware

## 1.1.6

### Patch Changes

- b73eb5a: fix middleware

## 1.1.5

### Patch Changes

- fix params and query being stale after validation

## 1.1.4

### Patch Changes

- Fix middleware calling handler many times

## 1.1.3

### Patch Changes

- Run middleware for 404, handle HEAD and OPTIONS
- Added package.json exports

## 1.1.2

### Patch Changes

- maybe fix bun

## 1.1.1

### Patch Changes

- add listen()

## 1.1.0

### Minor Changes

- Replce onRequest with use

## 1.0.8

### Patch Changes

- Fix url

## 1.0.7

### Patch Changes

- Fix openapi, fix types for use

## 1.0.6

### Patch Changes

- Fix types without intsalling bun types

## 1.0.5

### Patch Changes

- Use nodejs es module support

## 1.0.4

### Patch Changes

- Better client config

## 1.0.3

### Patch Changes

- Updates

## 1.0.2

### Patch Changes

- Fixes onRequest ordering and many other issues

## 1.0.1

### Patch Changes

- Fix poublished package

## 1.0.0

### Major Changes

- Init

## 0.0.7

### Patch Changes

- remove the .js extension in the dynamic import

## 0.0.6

### Patch Changes

- Deduplicate the server methodsMap

## 0.0.5

### Patch Changes

- 3afb252: Fix tsc error on server entry file
- Output typescript files and not js files

## 0.0.4

### Patch Changes

- Fix \_\_dirname
- Removed big dep ts-json-schema-generator

## 0.0.3

### Patch Changes

- Fix \_\_dirname

## 0.0.2

### Patch Changes

- Added experimental --openapi

## 0.0.1

### Patch Changes

- 0eef621: Initial release
