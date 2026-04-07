---
'spiceflow': patch
---

Fix prerender and Vercel output handling to resolve build output directories from the project root before reading or copying emitted files, so custom output paths and wrapped builds still point at the correct folders.
