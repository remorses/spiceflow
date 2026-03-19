---
'spiceflow': patch
---

Add typed sub-components on `Head`: `Head.Meta`, `Head.Title`, `Head.Link`, `Head.Script`, `Head.Style`, and `Head.Base`. Each provides IDE autocomplete for its attributes using the `string & {}` pattern (known values appear in autocomplete, arbitrary strings still accepted). Always wrap head tags inside `<Head>` so they are properly deduplicated between layouts and pages.

```tsx
import { Head } from 'spiceflow/react'

<Head>
  <Head.Title>My App</Head.Title>
  <Head.Meta name="description" content="My page" />
  <Head.Meta property="og:title" content="My page" />
  <Head.Link rel="stylesheet" href="/styles.css" />
  <Head.Script src="/analytics.js" type="module" />
</Head>
```
