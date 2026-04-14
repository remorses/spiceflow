// Programmatic Vitest runner for the Cloudflare example integration suite.
import process from 'node:process'
import { startVitest } from 'vitest/node'

const vitest = await startVitest('test', ['tests/main.test.ts'], {
  root: process.cwd(),
  run: true,
  watch: false,
  config: false,
  fileParallelism: false,
  testTimeout: 120_000,
  hookTimeout: 120_000,
})

if (!vitest) {
  process.exit(1)
}

const failed = vitest.state.getCountOfFailedTests()
await vitest.close()

process.exit(failed > 0 ? 1 : 0)
