---
'spiceflow': patch
---

Add type-safe `href` prop to the `Link` component using the `SpiceflowRegister` pattern. When the app type is registered, `Link` autocompletes route paths and requires `params` for dynamic segments like `/users/:id`. Without registration, `href` stays `string` for full backwards compatibility. Also exports the `LinkProps` type from `spiceflow/react`.

```tsx
<Link href="/users/:id" params={{ id: '42' }} />
```
