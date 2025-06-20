# spiceflow

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
