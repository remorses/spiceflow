---
'spiceflow': patch
---

Export `router` object from `spiceflow/react` for client-side navigation. Provides `push`, `replace`, `back`, `forward`, `refresh`, `pathname`, and `subscribe` — no hooks needed, just a singleton you import and use anywhere.

```ts
import { router } from 'spiceflow/react'

router.push('/dashboard')
router.refresh()
console.log(router.pathname)

const unsub = router.subscribe(() => {
  console.log('navigated to', router.pathname)
})
```
