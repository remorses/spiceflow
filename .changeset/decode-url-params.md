---
'spiceflow': patch
---

Decode URL-encoded route params like Express does. Named params (`:id`, `:name`) were already decoded but the wildcard `*` param was not. Malformed percent sequences like `%ZZ` now pass through unchanged instead of crashing with a `URIError`.
