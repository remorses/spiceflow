---
'spiceflow': patch
---

Add native Deno runtime support. When running under Deno, `app.listen()` now uses `Deno.serve()` with web standard Request/Response directly, bypassing the `node:http` adapter for better performance. This is the same approach used for Bun's native `Bun.serve()`.
