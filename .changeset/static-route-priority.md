---
'spiceflow': patch
---

fix node `serveStatic()` so directory requests no longer throw `EISDIR`, serve exact files before directory indexes, and let concrete routes win while static assets still beat root `/*` fallback routes.
