// Normalizes Vite's built-in BASE_URL into a pathname-style base prefix.

function extractBasePathname(base: string): string {
  if (base.startsWith('http://') || base.startsWith('https://')) {
    const pathname = new URL(base).pathname.replace(/\/$/, '')
    return pathname || ''
  }
  return base === '/' ? '' : base.replace(/\/$/, '')
}

export function getBasePath(): string {
  const rawBase = (() => {
    try {
      return import.meta.env.BASE_URL
    } catch {
      return '/'
    }
  })()

  return extractBasePathname(rawBase)
}
