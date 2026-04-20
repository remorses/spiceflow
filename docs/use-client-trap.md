# `use client` trap in optimized `node_modules` dependencies

**This is about published dependencies from `node_modules`, not your app's own `src/` files.**

Your own app code is usually treated as source by Vite, so its module boundaries are normally preserved. This problem shows up when a package from `node_modules` contains both server code and client code, and Vite prebundles that dependency into an optimized server chunk.

If a bug only reproduces when importing a library from `node_modules`, and not when writing similar code directly in your app, this is the failure mode to look for.

When that happens, the `use client` boundary only works if the client file stays a separate module boundary.

**Bad pattern**

- published dependency has a server-safe entry file that imports a client file with a relative import
- a single package module mixes server-safe/shared exports with React hook or component exports behind `'use client'`
- Vite dependency optimization flattens both files into one optimized server dependency
- the client module gets evaluated against `react-server`
- startup crashes before the app renders

**Typical symptoms**

- `Class extends value undefined is not a constructor or null`
- `Component` / `useState` / `useEffect` / `prefetchDNS` is `undefined`
- `Cannot read properties of null (reading 'useState' | 'useEffect' | 'useCallback')`
- `Invalid hook call. Hooks can only be called inside of the body of a function component`
- Cloudflare dev crashes during worker startup before any request hits your app

```text
published dependency entry
  └─ imports ./client-widget.tsx   ('use client')
       └─ optimizer flattens package into one server chunk in node_modules/.vite
             └─ client code now runs with react.react-server
                  └─ boom
```

**Safer pattern**

- keep the main package entry server-safe
- never put server-safe or shared exports in the same module as `'use client'` in a published package
- split vanilla state, helpers, constants, and types into a separate server-safe file
- expose client code through a package subpath such as `my-lib/client`
- import the client boundary through that package subpath instead of a relative path from the server entry

```ts
// safer than importing ./client-widget directly from the main entry
import { ClientWidget } from 'my-lib/client'
```

```text
good
  chat-store.ts   -> vanilla store, helpers, types
  chat-state.ts   -> 'use client' React hook wrapper

bad
  chat-state.ts   -> exports types + vanilla store + React hook in one module
```

This matters most in Vite RSC dev, Cloudflare runner startup, and any environment that eagerly imports the full worker/module graph to inspect exports.

If this only happens for a package from `node_modules` and not for your app's own `src/` files, this is the exact class of issue described here.

## Fast diagnosis

If you see one of the errors above, the quickest way to confirm this failure mode is:

1. **Check where the crash starts**
   - if the first useful stack frame points into a package under `node_modules` instead of your app `src/`, suspect an optimized package-boundary issue
   - if the stack mentions a hook helper like `useState`, `useEffect`, `useCallback`, `Component`, or a client-only React DOM helper, that package likely leaked client code into a server chunk

2. **Check whether it is server-only**
   - if the bug happens during SSR, worker startup, or the first server render but not in the browser-only client path, this is a strong signal that a package client boundary got flattened into the server graph

3. **Check whether the module mixes concerns**
   - if the crashing package module exports both shared/server-safe values and React hook/component exports, split it first before trying anything more exotic

## Fast fix checklist

- move shared types, constants, helpers, and vanilla stores into a server-safe file with no `'use client'`
- keep hook wrappers and interactive components in a separate `'use client'` file
- do not import a client file from a server-safe package entry with a relative import
- expose client code through a package subpath like `pkg/client` when the package is meant to be consumed from `node_modules`
- rebuild the package and restart dev so Vite throws away the old optimized chunks

## How to debug this

1. **Look at the optimized dep output**
   - inspect `node_modules/.vite/deps_rsc/` and `deps_ssr/`
   - search for the crashing package and check whether client-only code got bundled into a server chunk

2. **Search for client-only React APIs in server chunks**
   - things like `extends ...Component`, `useState`, `useEffect`, `prefetchDNS`, `preconnect`, `Suspense`
   - if they are imported from a `react-server` build, your boundary was lost

3. **Check whether the crash happens at import time**
   - if dev dies before any request, the worker entry or export-inspection path is evaluating the bad module eagerly

4. **Inspect package boundaries**
   - main entry should not statically pull in a client file via `./relative-import`
   - move the client module behind an exported subpath like `pkg/client`

5. **Validate the fix**
   - rebuild the package
   - restart dev so Vite re-optimizes deps
   - confirm the server starts and the bad optimized chunk disappears or no longer contains the client code

Useful search pattern:

```bash
rg -n "extends .*Component|useState|useEffect|prefetchDNS|preconnect|react-server" node_modules/.vite
```
