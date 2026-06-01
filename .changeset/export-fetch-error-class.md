---
'spiceflow': patch
---

Export `SpiceflowFetchError` class as a value from `spiceflow/client` so consumers can use `instanceof SpiceflowFetchError` to narrow errors returned by `createSpiceflowFetch`. Previously the class was internal-only and consumers had to use structural casts to access `.status` and `.value`.
