---
'spiceflow': patch
---

Stop inferring loader data from handler return types and let `useLoaderData<T>()` / `router.getLoaderData<T>()` accept explicit data types, avoiding circular app inference when rendered components use registered routing APIs. Also make the exported `redirect()` string-only while keeping route-aware redirect typing on handler context.
