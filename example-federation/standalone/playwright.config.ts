import { defineConfig, devices } from '@playwright/test'

const remotePort = 3051
const standalonePort = 3053

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: `http://localhost:${standalonePort}`,
    actionTimeout: 30000,
    navigationTimeout: 30000,
    trace: 'on-first-retry',
  },
  timeout: 60000,
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
      command: `pnpm preview --port ${standalonePort} --strict-port`,
      port: standalonePort,
      reuseExistingServer: true,
    },
  ],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
})
