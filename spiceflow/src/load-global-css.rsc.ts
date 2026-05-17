// RSC-only: loads global CSS via the vite-rsc transform.
// The static-analysis token below must appear only in executable code, not
// comments, because vite-rsc scans raw source before asserting the RSC env.

export function loadGlobalCss(): any {
  try {
    return import.meta.viteRsc.loadCss('virtual:app-entry')
  } catch {
    return undefined
  }
}
