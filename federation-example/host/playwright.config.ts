import { defineConfig, devices } from '@playwright/test'

const remotePort = 3051
const hostPort = 3052

const isStart = Boolean(process.env.E2E_START)

// Remote always runs as production build — federation remotes externalize
// React so the host's import map provides the shared instance. This avoids
// dual-React issues when the host is in dev mode.
const remoteCommand = `PORT=${remotePort} node dist/rsc/index.js`

const hostCommand = isStart
  ? `REMOTE_ORIGIN=http://localhost:${remotePort} PORT=${hostPort} node dist/rsc/index.js`
  : `REMOTE_ORIGIN=http://localhost:${remotePort} pnpm dev --port ${hostPort} --strict-port`

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: `http://localhost:${hostPort}`,
    actionTimeout: 5000,
    navigationTimeout: 10000,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: null,
        deviceScaleFactor: undefined,
      },
    },
  ],
  webServer: [
    {
      command: remoteCommand,
      cwd: '../remote',
      port: remotePort,
      reuseExistingServer: true,
    },
    {
      command: hostCommand,
      port: hostPort,
      reuseExistingServer: true,
    },
  ],
  fullyParallel: false,
  workers: 1,
  grepInvert: isStart ? /@dev/ : /@build/,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
})
