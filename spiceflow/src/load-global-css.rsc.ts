// RSC-only: loads global CSS via the vite-rsc transform.
// The import.meta.viteRsc.loadCss call MUST appear exactly as written below
// because vite-rsc's transform uses a regex to find and replace it at build time.
// Do not use optional chaining, ternaries, or put the pattern in comments.

import * as errore from 'errore'

export function loadGlobalCss(): any {
  const result = errore.try(() =>
    import.meta.viteRsc.loadCss('virtual:app-entry'),
  )
  return result instanceof Error ? undefined : result
}
