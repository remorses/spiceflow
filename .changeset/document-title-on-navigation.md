---
'spiceflow': patch
---

update `document.title` on client-side navigation. Previously a `<Head.Title>` change only took effect in the initial SSR HTML — the browser tab kept showing the old title after navigating between pages. `CollectedHead` now reads the latest title from the request-scoped head store and renders a tiny `'use client'` component whose `useEffect` assigns `document.title`, so the tab updates every time the RSC flight payload delivers a new title.
