/**
 * Wire up React.cache() for user server components.
 *
 * Problem: @vitejs/plugin-rsc vendors react-server-dom which bundles its own
 * React. The RSC renderer sets the cache dispatcher (ReactSharedInternals.A)
 * on THAT bundled React, but user code imports a separate React instance via
 * Vite's module resolution. So React.cache() in user code sees A = null and
 * degrades to no caching — every call creates a fresh object.
 *
 * Fix: set up a cache dispatcher on the user-code React that uses
 * AsyncLocalStorage for per-request isolation. Call runWithRequestCache()
 * around the RSC rendering pass so all React.cache() calls within the same
 * request share the same cache Map.
 */
import React from 'react'
import { AsyncLocalStorage } from 'node:async_hooks'

// React 19 exposes internals under different keys depending on the build:
//   - react-server condition → __SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
//   - default/client build   → __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
// The cache dispatcher lives at internals.A in both.
const internals: Record<string, any> | undefined =
  (React as any).__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ??
  (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE

const requestCacheStorage = new AsyncLocalStorage<Map<Function, unknown>>()

const cacheDispatcher: Record<string, Function> = {
  getCacheForType<T>(resourceType: () => T): T {
    const cache = requestCacheStorage.getStore()
    if (!cache) {
      // Not inside a request — fall back to uncached
      return resourceType()
    }
    let entry = cache.get(resourceType) as T | undefined
    if (entry === undefined) {
      entry = resourceType()
      cache.set(resourceType, entry)
    }
    return entry
  },
  // React.cacheSignal() — return null when not available
  cacheSignal(): null {
    return null
  },
  // getOwner() — used in DEV for component ownership tracking.
  // Return null since we don't track ownership in the user-side dispatcher.
  getOwner(): null {
    return null
  },
}

// Wire up if the dispatcher isn't already set
if (internals && !internals.A) {
  internals.A = cacheDispatcher
}

/**
 * Run a callback with a fresh per-request cache. Wrap this around
 * renderToReadableStream so React.cache() calls in user server components
 * share the same cache Map within a single request.
 */
export function runWithRequestCache<T>(fn: () => T): T {
  return requestCacheStorage.run(new Map(), fn)
}
