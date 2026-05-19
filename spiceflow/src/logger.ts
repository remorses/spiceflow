// Spiceflow build logger. Wraps console with colored, prefixed output.
// All formatting (icon, "spiceflow" prefix, dim details) is handled here
// so callers just pass plain strings.
import { colors } from './colors.js'

export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2).replace(/\.0+$|0+$/g, '')}s`
}

function format(icon: string, message: string, detail?: string) {
  let line = `${icon} ${colors.cyan('spiceflow')} ${message}`
  if (detail) line += `\n  ${colors.dim(detail)}`
  return line
}

export const logger = {
  info(message: string) {
    console.log(format(colors.cyan('■'), message))
  },
  success(message: string, detail?: string) {
    console.log(format(colors.green('✓'), message, detail))
  },
  error(message: string) {
    console.error(format(colors.red('✗'), message))
  },
}
