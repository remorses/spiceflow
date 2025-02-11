// vite.config.ts
import { defineConfig } from 'vite'
import { spiceflowPlugin } from './dist/vite'

const execArgv = process.env.PROFILE
  ? ['--cpu-prof', '--cpu-prof-dir=./profiling']
  : []

export default defineConfig({
  esbuild: {
    jsx: 'transform',
  },
  // plugins: [
  //   spiceflowPlugin({
  //     // options
  //   }),
  // ],
  resolve: {
    conditions: ['react-server'],
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
