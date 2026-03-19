---
'spiceflow': patch
---

Add RSC prefetching on Link hover. The `Link` component now fetches the RSC payload when the user hovers (with 80ms debounce), focuses, or touches a link. Cached responses are used on navigation, making client-side page transitions feel instant. Prefetch is enabled by default and can be disabled with `<Link prefetch={false}>`. A `prefetchRoute(href)` function is also exported from `spiceflow/react` for programmatic use.
