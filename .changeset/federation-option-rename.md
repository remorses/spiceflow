---
'spiceflow': patch
---

rename `remote` plugin option to `federation: 'remote'` in `spiceflowPlugin`. The new string enum leaves room for future `federation: 'host'` config and makes the intent explicit at the call site.

```ts
// before
spiceflowPlugin({ entry: './app/main.tsx', remote: true })

// after
spiceflowPlugin({ entry: './app/main.tsx', federation: 'remote' })
```
