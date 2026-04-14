---
'spiceflow': patch
---

Improve prerender build failures by including the failing response body in the error output, so static page build errors surface the original message instead of only a generic `500`.
