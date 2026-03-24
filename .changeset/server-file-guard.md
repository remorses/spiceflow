---
'spiceflow': patch
---

Add `.server.ts` file boundary guard that prevents server-only files from being imported in client code. Files ending in `.server.ts`, `.server.tsx`, etc. (or inside a `.server/` directory) now produce a clear error when imported from a client component during development. The error appears in the terminal with the exact import path and the offending file, similar to how React Router handles this convention.
