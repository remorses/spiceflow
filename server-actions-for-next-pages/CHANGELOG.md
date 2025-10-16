# server-actions-for-next-pages

## 1.5.2

### Patch Changes

- Add AbortController support for cancelling ongoing RPC requests
- Client-side abort signals are automatically detected in arguments and used for fetch
- Server-side replaces client signals with request abort signals
- Server functions can respond to request cancellations via signal.aborted
- Support for both regular async functions and async generators
- Add test page demonstrating abort controller functionality

## 1.5.1

### Patch Changes

- Fix async generators to return AsyncGenerator directly instead of Promise<AsyncGenerator>
- Async generators now work without await: `const gen = generateNumbers()` instead of `const gen = await generateNumbers()`

## 1.5.0

### Minor Changes

- Add request to context

## 1.4.0

### Minor Changes

- Add support for async generators

## 1.3.1

### Patch Changes

- Fix sourcemap output

## 1.3.0

### Minor Changes

- Use dynamic import to support superjson 2.0

## 1.2.1

### Patch Changes

- Restore to wroking version

## 1.0.0

### Major Changes

- be685e1: - Add support for server actions in the `/app` directory
  - Export headers() and cookies() functions more similar to Next.js instead of `getContext`
  - Deprecate the `getContext` functions
  - Serialize with superjson instead of JSON
  - Drop support for `getInitialProps`
  - Add support for `export const runtime`
  - Allow exports like revalidate and preferredRegion

## 0.2.1

### Patch Changes

- Support for multiple plugins with loaders at the same time

## 0.2.0

### Minor Changes

- Add support for --turbo using loader

## 0.1.0

### Minor Changes

- added functions headers and cookies to context
