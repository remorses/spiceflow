---
'spiceflow': patch
---

fix route matching specificity so regex-constrained params and more specific wildcard routes win over generic catch-alls, and fix wildcard param extraction for patterns like `/layout/*/page` so only the wildcard segment is captured. React layout rendering now receives each layout route's own `params` instead of reusing the page params, which fixes nested layout trees that depend on dynamic segments.
