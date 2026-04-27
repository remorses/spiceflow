// RSC-only: loads global CSS via the vite-rsc transform.
// The static-analysis token below must appear only in executable code, not
// comments, because vite-rsc scans raw source before asserting the RSC env.

import * as errore from 'errore'

export function loadGlobalCss(): any {
  const result = errore.try(() =>
    import.meta.viteRsc.loadCss('virtual:app-entry'),
  )
  return result instanceof Error ? undefined : result
}
