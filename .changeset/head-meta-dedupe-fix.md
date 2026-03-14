---
'spiceflow': patch
---

Fix `Head` SSR metadata handling so nested pages override layout defaults by metadata identity instead of only removing exact duplicates. This also narrows absolute URL rewriting to URL-valued social metadata like `og:image`, `og:url`, and `twitter:image`, and keeps nested `Head` children such as fragments working during SSR.
