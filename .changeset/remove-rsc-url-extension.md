---
'spiceflow': patch
---

Stop appending `.rsc` to the URL pathname during client-side navigations. RSC data fetches now use only the `?__rsc` query parameter to signal the server, producing cleaner URLs (e.g. `/about?__rsc=` instead of `/about.rsc?__rsc=`). Prerendered `.rsc` Flight data files on disk are still served correctly via `serveStatic`.
