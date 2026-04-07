---
'spiceflow': patch
---

Fix `AnySpiceflow` fallbacks across the typed fetch client, proxy client, and React router helpers so runtime-defined apps degrade to ergonomic `any` types instead of leaking `unknown` or `never`. Add a regression test that exercises `createSpiceflowFetch`, `createSpiceflowClient`, `createRouter`, and `createHref` with `AnySpiceflow`, and fix broken source re-exports for `createRouter` and `getActionAbortController` in `spiceflow/react`.
