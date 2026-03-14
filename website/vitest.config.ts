// Vitest config for the website package.
import { defineConfig } from 'vitest/config'

const execArgv = process.env.PROFILE
  ? ['--cpu-prof', '--cpu-prof-dir=./profiling']
  : []

export default defineConfig({
  esbuild: {
    jsx: 'transform',
  },
  test: {
    exclude: ['**/dist/**', '**/esm/**', '**/node_modules/**', '**/e2e/**'],
    pool: 'threads',
    isolate: false,
    fileParallelism: false,
    execArgv,
  },
})
