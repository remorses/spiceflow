---
'spiceflow': patch
---

Fix production RSC entries mounted inside bundlers like Next.js (webpack) by falling back from `import.meta.filename` to `import.meta.url` + `fileURLToPath()` when resolving the client assets directory for `serveStatic` and `distDir`/`publicDir`. Previously, `app.handle()` would crash or silently skip static asset serving when the built dist was imported by a non-Node bundler where `import.meta.filename` is undefined.
