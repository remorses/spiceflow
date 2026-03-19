---
'spiceflow': patch
---

Make `context.response` a mutable plain object with `{ headers, status }` and apply handler-provided status codes consistently across API and React page/layout routes, while preserving explicit statuses from returned or thrown `Response` objects. This also reverts the lazy `_abortSetup` signal optimization back to the simpler eager abort-controller wiring in Node request adapters to avoid abort-related regressions in production/start flows.
