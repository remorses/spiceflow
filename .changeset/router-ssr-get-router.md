---
'spiceflow': patch
---

Redesign the router API around `getRouter()` so `href()` and `getLoaderData()` live on the returned router object, export `useLoaderData()` and `useRouterState()` directly from `spiceflow/react`, and make the same router access patterns work during SSR through request-scoped router context. This also removes the old `createRouter()` and standalone `getLoaderData()` API in favor of the new pre-release shape.
