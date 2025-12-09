# server-actions-for-next-pages

## 2.1.1

### Patch Changes

- Fix streaming error serialization to properly pass error messages to client
- Errors in SSE streams are now JSON-serialized with `name`, `message`, `stack` (dev only), and `thrownValue` for non-Error values
- Handle non-Error thrown values with descriptive message: "A non-Error value was thrown: ..."
- Fix client-side error handling to properly parse JSON error data from SSE streams
- Fix generator error handling to handle all non-2xx status codes (not just 502)
- Fix buggy error handling logic in RPC fetchers that could silently swallow errors
- Add backwards compatibility for plain text error messages

## 2.1.0

### Minor Changes

- Add custom fetch function support - you can now pass a `fetch` field in object parameters to customize fetch behavior (e.g., add authentication headers)
- Client-side: Custom fetch functions can be provided and will be used for RPC calls instead of global fetch
- Server-side: Global fetch is automatically injected into object parameters unless already provided by the user
- Add comprehensive documentation for AbortController/AbortSignal support in README
- Add documentation for custom fetch functionality with usage examples

## 2.0.0

### Major Changes

- **BREAKING**: Requires Next.js 16+ for Turbopack support
- **BREAKING**: Migrated from deprecated `experimental.turbo` to `turbopack` config
- Use official Next.js 16 turbopack configuration syntax with condition-based rules
- Replace deprecated browser/default structure with array of rules using `condition` property
- Add `{not: 'foreign'}` condition to exclude node_modules from transformation
- Use documented boolean operators: `{all: [...]}` for combining conditions
- Fix glob patterns to only target pages directory: `{./src/pages,./pages/}/**/*.{ts,tsx,js,jsx}`

### Migration Guide

If you're upgrading from 1.x, ensure you're using Next.js 16+ and the new turbopack configuration format is automatically applied. No manual config changes needed.

## 1.5.11

### Patch Changes

- Fix "exports is not defined" error by using specific glob pattern instead of broad `**/*.{ts,tsx,js,jsx}`
- Use glob pattern `{./src/pages,./pages/}/**/*.{ts,tsx,js,jsx}` to target only pages directory
- Avoid transforming node_modules files which was causing CommonJS errors

## 1.5.10

### Patch Changes

- Fix turbopack configuration bug where files were interpreted as JS instead of TSX
- Restore `as: '*.tsx'` in turbopack loader config to ensure proper TypeScript/JSX interpretation
- Restore browser/default structure in turbopack.rules for correct client/server detection
- Revert turbopackLoader to use `export default` instead of `module.exports`
- Remove experimental.turbo config, use only turbopack.rules
- Remove incorrect Next.js 16 documentation comments

## 1.5.9

### Patch Changes

- Add comprehensive documentation for turbopack configuration with links to official Next.js docs
- Document advanced condition syntax (`all`, `any`, `not`, `path`, `content`)
- Add real-world examples from GitHub repositories showing turbopack usage
- Clarify that condition syntax was added in Next.js 16.0.0 but loaders are not yet functional in beta

## 1.5.8

### Patch Changes

- Remove Next.js 16 turbopack.rules configuration as custom loaders are not functional in Next.js 16 beta
- **BREAKING for Next.js 16 users**: You MUST use `--webpack` flag to build with Next.js 16
  - Dev: `next dev --webpack`
  - Build: `next build --webpack`
- Next.js 15 with `experimental.turbo` continues to work
- This will be resolved when Next.js 16 stabilizes turbopack custom loader support

## 1.5.7

### Patch Changes

- Add backward compatibility with Next.js 15 by supporting both `experimental.turbo.rules` and `turbopack.rules`
- Ensure turbopack configuration works across Next.js 15 and 16

## 1.5.6

### Patch Changes

- Update turbopack loader implementation for Next.js 16 compatibility
- Change loader export from `export default` to `module.exports` for better turbopack compatibility
- Add directive checking to skip processing files without `"poor man's use server"`
- Simplify turbopack.rules configuration structure
- **Note**: Turbopack custom loaders are experimental in Next.js 16 beta. For production use, run builds with `--webpack` flag until turbopack loader support stabilizes

## 1.5.5

### Patch Changes

- Fix turbopack.rules to use correct flat structure (loaders array at top level)
- Keep experimental.turbo.rules with webpack-style browser/default structure for compatibility

## 1.5.4

### Patch Changes

- Fix root turbopack configuration key from `turbo.rules` to `turbopack.rules`

## 1.5.3

### Patch Changes

- Add support for both `experimental.turbo.rules` and `turbo.rules` configurations for Turbopack
- Apply turbopack loader to both locations for better Next.js compatibility

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
