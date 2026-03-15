// Client component that intentionally throws during SSR but renders fine in the browser.
// Used to test the __NO_HYDRATE fallback: when SSR fails, the server injects
// self.__NO_HYDRATE=1 and the browser uses createRoot instead of hydrateRoot.
"use client"

export function ThrowsDuringSSR() {
  if (typeof window === 'undefined') {
    throw new Error('Intentional SSR error for testing __NO_HYDRATE fallback')
  }
  return <div data-testid="ssr-recovered">Recovered via CSR</div>
}
