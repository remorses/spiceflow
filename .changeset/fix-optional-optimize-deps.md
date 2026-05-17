---
'spiceflow': patch
---

Avoid unresolved dependency warnings in Vite dev servers when optional dependencies are not installed. Spiceflow no longer asks Vite to pre-bundle the vendored `history` package, and `zod` is only pre-bundled when the app actually has it installed.
