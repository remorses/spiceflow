---
'spiceflow': patch
---

Detect duplicate spiceflow installations at build time. When the Vite plugin resolves to a different copy of spiceflow than the project's `node_modules`, the build now fails immediately with a clear error message showing both paths and how to fix it (`pnpm dedupe spiceflow`). Previously, duplicate installations caused cryptic runtime errors like "FlightDataContext is missing" that were hard to diagnose and easy to deploy accidentally.
