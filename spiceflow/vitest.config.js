// Vitest config for the spiceflow package.
import { defineConfig } from 'vitest/config'

const execArgv = process.env.PROFILE
  ? ['--cpu-prof', '--cpu-prof-dir=./profiling']
  : []

const routerContextPath = new URL('./src/router-context.ts', import.meta.url)

export default defineConfig({
  esbuild: {
    jsx: 'transform',
  },
  resolve: {
    alias: {
      '#router-context': routerContextPath.pathname,
    },
    conditions: ['react-server', 'ssr'],
  },
  test: {
    exclude: ['**/dist/**', '**/esm/**', '**/node_modules/**', '**/e2e/**'],
    pool: 'threads',
    fileParallelism: false,
    execArgv,
  },
})
