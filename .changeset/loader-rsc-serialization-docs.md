---
'spiceflow': patch
---

document that loader return values are serialized through the React RSC flight format, so you can return JSX (including client component elements with their props), `Promise`, async iterators, `Map`, `Set`, `Date`, `BigInt`, typed arrays, and client component references — all deserialized faithfully on the client.
