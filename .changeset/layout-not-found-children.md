---
'spiceflow': patch
---

All matched layout handlers now receive `children` as `null` when no page route matches (404). This lets any layout in the chain detect not-found state and render a custom 404 UI with `{children ?? <NotFound />}`. Previously the recommended pattern was `.page('/*', ...)` which could interfere with API route matching. Apps without layouts continue to render the built-in `DefaultNotFoundPage` as before.
