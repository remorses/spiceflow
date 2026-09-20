---
'spiceflow': minor
---

Tag client navigations with React 19.3 View Transition types.

`router.push()`, user `router.replace()`, and history forward call `addTransitionType('navigation-forward')`. History back uses `navigation-back`. `router.refresh()`, loader updates, and server-action re-renders stay untyped.

Wrap persistent layout children in `<ViewTransition>` and style the **update** trigger:

```tsx
import { ViewTransition } from 'react'

<ViewTransition
  update={{
    'navigation-forward': 'slide-forward',
    'navigation-back': 'slide-back',
  }}
>
  {children}
</ViewTransition>
```

```css
::view-transition-old(.slide-forward) {
  animation-name: slide-to-left;
}
::view-transition-new(.slide-forward) {
  animation-name: slide-from-right;
}
::view-transition-old(.slide-back) {
  animation-name: slide-to-right;
}
::view-transition-new(.slide-back) {
  animation-name: slide-from-left;
}
```
