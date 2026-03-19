---
'spiceflow': patch
---

Refactor the `handle` method in `spiceflow.tsx` by extracting a unified `runMiddlewareChain` that both React and API paths share, and `errorToResponse` / `shouldEnterReactPath` as focused helpers with positional args. `renderReact` stays as one cohesive method. Also fix `import.meta.viteRsc.loadCss` guard so tests don't crash outside Vite, and `turnHandlerResultIntoResponse` now uses positional args. No behavioral changes — pure internal refactor.
