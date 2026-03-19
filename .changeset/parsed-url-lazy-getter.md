---
'spiceflow': patch
---

Optimize `SpiceflowRequest.parsedUrl` to be a lazy getter that parses the URL once on first access and caches it, instead of requiring external assignment. This simplifies the `handle()` method and `nodeToWebRequest()` by removing manual `parsedUrl` assignments — the URL is always derived from `this.url` on demand.
