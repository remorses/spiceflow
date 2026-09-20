---
'spiceflow': minor
---

Update examples to React 19.3 and tag client navigations with React View Transition types.

Client `router.push` / `replace` and history forward now call `addTransitionType('navigation-forward')`. History back uses `navigation-back`. Wrap page content in `<ViewTransition>` to animate those route changes:

```tsx
import { ViewTransition } from 'react'

<ViewTransition
  enter={{
    'navigation-forward': 'slide-from-right',
    'navigation-back': 'slide-from-left',
  }}
>
  {children}
</ViewTransition>
```
