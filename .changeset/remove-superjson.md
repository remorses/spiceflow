---
'spiceflow': patch
---

Remove superjson dependency. All API responses now use plain `JSON.stringify` instead of superjson serialization. The `disableSuperJsonUnlessRpc` constructor option and the `x-spiceflow-agent` header are removed since they were only used for superjson detection. Clients no longer attempt superjson deserialization; responses are parsed as standard JSON.

If you were relying on superjson to serialize `Date`, `Map`, `Set`, or `BigInt` in API responses, serialize these values explicitly before returning them (e.g. call `.toISOString()` on dates, convert maps to plain objects).
