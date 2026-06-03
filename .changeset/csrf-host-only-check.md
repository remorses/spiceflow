---
'spiceflow': patch
---

CSRF origin check for server actions now compares hosts only, ignoring the protocol. This fixes false 403 errors when deployed behind TLS-terminating reverse proxies (Fly.io, Cloudflare, AWS ALB) where the Origin header uses `https` but the server sees `http`. The error message now includes both the request and server origins for easier debugging.
