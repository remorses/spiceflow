---
'spiceflow': patch
---

Fix `throw redirect()` in server actions and prevent client state loss on direct action calls. Redirect Responses thrown in server actions are now encoded in the RSC flight payload instead of returned as raw HTTP 307 responses, which caused `fetch()` to follow the redirect and break on Cloudflare Workers. The client detects the redirect in the action response and navigates via `router.push()`. Direct server action calls (non-form) no longer trigger a full page re-render, preserving client component `useState`. Form submissions still re-render the page tree so server-rendered content updates as expected. Also documents the `allowedActionOrigins` option for CSRF protection when using reverse proxies or tunnels.
