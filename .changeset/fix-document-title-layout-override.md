---
'spiceflow': patch
---

fix `<Head.Title>` in a page being overridden by the layout's title after hydration. `CollectedHead` now derives the title it passes to the client-side `DocumentTitle` component from the deduplicated tag map rather than from a separate `reversed.find()` call, so `document.title` matches the server-rendered `<title>` element. Previously the SSR HTML contained the correct page title but the `useEffect` in `DocumentTitle` fired with the layout's title, silently replacing it in the browser tab right after hydration.
