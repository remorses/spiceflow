---
'spiceflow': patch
---

Add `useRouterState` hook and `router.searchParams` getter. `useRouterState()` subscribes to navigation changes via `useSyncExternalStore` and returns the current location with a parsed `searchParams` property typed as `ReadonlyURLSearchParams`. The `router.searchParams` getter provides the same read-only access outside of React components.
