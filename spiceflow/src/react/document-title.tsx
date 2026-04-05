// Client component that sets `document.title` whenever a new value arrives
// via the RSC flight payload. Rendered by `CollectedHead` when a
// `<Head.Title>` is present so client-side navigation updates the browser tab.
'use client'

import React from 'react'

export function DocumentTitle({ title }: { title: string }) {
  React.useEffect(() => {
    document.title = title
  }, [title])
  return null
}
