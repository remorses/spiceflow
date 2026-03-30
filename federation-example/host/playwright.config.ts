import { defineConfig, devices } from '@playwright/test'

const remotePort = 3051
const hostPort = 3052

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
      command: `PORT=${remotePort} node dist/rsc/index.js`,
      cwd: '../remote',
      port: remotePort,
      reuseExistingServer: true,
    },
    {
      command: `REMOTE_ORIGIN=http://localhost:${remotePort} PORT=${hostPort} node dist/rsc/index.js`,
      port: hostPort,
      reuseExistingServer: true,
    },
  ],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
})
