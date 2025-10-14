# Agent Documentation

## Project Overview

**server-actions-for-next-pages** is a Next.js plugin that enables Server Actions-like functionality in the `/pages` directory (and `/app` directory). It allows you to call server-side functions directly from client components without manually creating API routes.

### Key Concepts

- Fork of [next-rpc](https://github.com/Janpot/next-rpc) with enhancements
- Uses Babel transform to convert server functions into RPC endpoints
- Serialization via [superjson](https://github.com/blitz-js/superjson)
- Supports both Node.js and Edge runtimes
- Supports async generators for streaming responses

## Architecture

### Build-time Transformation (Babel Plugin)

**File**: `server-actions-for-next-pages/src/babelTransformRpc.ts`

The Babel plugin processes files with `"poor man's use server"` directive:

1. **Server Build**: Wraps exported functions with `createRpcMethod()` and generates a JSON-RPC handler
2. **Client Build**: Replaces exported functions with `createRpcFetcher()` calls

**Detection Logic**:
- Detects async functions and async generators via `node.async || node.generator` (line 232-234)
- Tracks generator metadata in `rpcMethodMeta` Map (line 236)
- Passes `isGenerator: true` flag to client code for generators (lines 444-475)

### Server-side Runtime

**File**: `server-actions-for-next-pages/src/server.ts`

- `createRpcMethod()`: Wraps server functions with optional `wrapMethod` middleware
- `createRpcHandler()`: Creates JSON-RPC 2.0 compliant request handler
- **Streaming Detection** (lines 107-118): Checks if result has `Symbol.asyncIterator`, returns Server-Sent Events (SSE) stream
- Supports both Edge (Request/Response) and Node.js (req/res) runtimes

### Client-side Runtime

**File**: `server-actions-for-next-pages/src/browser.ts`

**Key Functions**:

1. **`yieldServerSentEvents()`** (lines 8-35): Parses SSE stream and deserializes chunks
2. **`fetchAndStreamResults()`** (lines 37-94): Core fetch logic with error handling and streaming
3. **`createRpcFetcher()`** (lines 96-112): Factory that returns either:
   - `async function*` for generators (lazy evaluation)
   - `async function` for regular functions

**Generator Behavior**:
- Regular async functions: `return await fetchAndStreamResults()` immediately
- Async generators: `yield* fetchAndStreamResults()` - defers fetch until first `next()` call

## Recent Changes: Lazy Async Generators

### Problem
Prior to this change, calling a server-side async generator on the client returned `Promise<AsyncGenerator>` instead of `AsyncGenerator`:

```typescript
// Before - required await
const generator = await generateNumbers();
for await (const item of generator) { ... }
```

### Solution
Modified the transform and runtime to detect generators and return an async generator directly:

```typescript
// After - no await needed
const generator = generateNumbers();
for await (const item of generator) { ... }
```

### Implementation Details

**Changed Files**:

1. **babelTransformRpc.ts**:
   - Added `rpcMethodMeta` Map to track which exports are generators (line 236)
   - Store `isGenerator: !!node.generator` for each method (lines 256, 286)
   - Pass `isGenerator: true` in object argument to `createRpcFetcher()` (lines 444-475)

2. **browser.ts**:
   - Changed signature: `createRpcFetcher({ url, method, isGenerator })` with object argument
   - When `isGenerator: true`, return `async function*` that yields from `fetchAndStreamResults()`
   - Extracted common logic into `fetchAndStreamResults()` helper function

### Key Insight

Using `async function*` that `yield*` from another async generator:
- Returns `AsyncGenerator` immediately (not wrapped in Promise)
- Defers execution until first `.next()` call
- Fetch only happens when consumer starts iterating

## File Structure

```
server-actions-for-next-pages/
├── src/
│   ├── babelTransformRpc.ts    # Babel plugin (client/server transforms)
│   ├── browser.ts              # Client-side RPC fetcher
│   ├── server.ts               # Server-side RPC handler
│   ├── jsonRpc.ts              # JSON-RPC types
│   ├── context.ts              # AsyncLocalStorage context for req/res
│   ├── context-internal.ts     # Internal context helpers
│   ├── headers.ts              # Headers/cookies access
│   └── utils.ts                # Babel AST utilities
├── example-app/                # Test application
│   ├── src/pages/api/          # Server actions location
│   └── plugin-outputs/         # Debug outputs (DEBUG_ACTIONS=1)
```

## Testing

### Debug Mode
Set `DEBUG_ACTIONS=1` to output transformed files to `plugin-outputs/`:
- `client-*.ts`: Client-side transformed code (fetch calls)
- `server-*.ts`: Server-side transformed code (RPC handlers)

### Example Test Case

**Server**: `example-app/src/pages/api/actions-node.ts`
```typescript
export async function* generateNumbers() {
  let count = 0;
  while (count < 10) {
    await sleep(1000);
    yield { count };
    count++;
  }
}
```

**Client**: `example-app/src/pages/index.tsx`
```typescript
const generator = generateNumbers(); // No await!
for await (const { count } of generator) {
  setCount(count);
}
```

## Common Commands

```bash
# Build library
cd server-actions-for-next-pages && npm run build

# Build with debug output
cd example-app && DEBUG_ACTIONS=1 npm run build

# Watch mode
cd server-actions-for-next-pages && npm run watch
```

## Important Notes for AI Agents

1. **Never start servers**: This is a build-time plugin, focus on the transformation logic
2. **Babel AST manipulation**: The core logic is AST transformation, understand `@babel/types`
3. **Two build targets**: Code is transformed differently for client vs server
4. **Generator detection**: `node.generator` flag distinguishes generators from async functions
5. **Streaming protocol**: Uses Server-Sent Events (SSE) with `text/event-stream` content-type
6. **Serialization**: All args/results go through superjson (supports Date, Map, Set, etc.)
7. **Error handling**: Status 502 indicates server function threw an error

## Related Documentation

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
