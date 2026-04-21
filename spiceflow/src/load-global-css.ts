// Fallback for non-RSC environments. Global CSS loading is only available
// in the RSC environment via the vite-rsc transform.

export function loadGlobalCss(): any {
  return undefined
}
