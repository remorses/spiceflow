---
'spiceflow': patch
---

add deployment skew protection for React Server Component navigations and server actions by deriving a production deployment id from the Vite client bootstrap, storing it in a secure cookie on document requests, and forcing a hard document navigation when stale tabs hit newer deployments.
