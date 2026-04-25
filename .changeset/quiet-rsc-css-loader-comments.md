---
'spiceflow': patch
---

fix vite-rsc CSS loading so shared Spiceflow modules do not contain the static `loadCss` token in comments, avoiding non-RSC environment assertion flashes during Cloudflare development.
