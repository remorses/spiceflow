---
'spiceflow': minor
---

add `isolateStyles` prop to `RemoteComponent` for Shadow DOM style isolation. When enabled, remote content renders inside a shadow root using Declarative Shadow DOM for SSR, preventing CSS from leaking between host and remote apps. CSS links are injected inside the shadow root instead of `document.head`, and host page styles cannot penetrate the shadow boundary. CSS custom properties (variables) still work across the boundary for theming.

```tsx
<RemoteComponent
  src="https://remote.example.com/api/widget"
  props={{ theme: 'dark' }}
  isolateStyles
/>
```
