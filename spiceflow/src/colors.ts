// Tiny terminal color helpers for Spiceflow build logs.
// Vendored instead of depending on picocolors so the Vite plugin stays dependency-light.
const env = typeof process === 'undefined' ? undefined : process.env

const enabled =
  env?.NO_COLOR === undefined &&
  env?.NODE_DISABLE_COLORS === undefined &&
  env?.FORCE_COLOR !== '0'

function formatter(open: string, close: string) {
  return (value: string) => (enabled ? `${open}${value}${close}` : value)
}

export const colors = {
  cyan: formatter('\x1b[36m', '\x1b[39m'),
  dim: formatter('\x1b[2m', '\x1b[22m'),
  green: formatter('\x1b[32m', '\x1b[39m'),
  red: formatter('\x1b[31m', '\x1b[39m'),
}
