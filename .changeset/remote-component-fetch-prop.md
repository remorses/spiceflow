---
'spiceflow': patch
---

Add `fetch` prop to `RemoteComponent` for local federation without a network round-trip. Pass `app.handle` to call a same-process endpoint directly instead of going through HTTP. When `fetch` is provided, `src` can be a relative path like `/api/widget`.

```tsx
<RemoteComponent
  src="/api/local-widget"
  fetch={app.handle}
  props={{ label: 'Self-hosted' }}
/>
```
