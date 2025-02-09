// vite.config.ts
import { defineConfig } from 'vite'

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
    updateSnapshot: true,
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false,
        execArgv,
      },
    },
  },
})
