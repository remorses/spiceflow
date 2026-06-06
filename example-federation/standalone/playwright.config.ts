import { defineConfig, devices } from '@playwright/test'

const remotePort = 3051
const standalonePort = 3053
const useDevRemote = process.env['REMOTE_MODE'] === 'dev'

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
      command: useDevRemote
        ? `pnpm exec vite dev --host 127.0.0.1 --port ${remotePort}`
        : `PORT=${remotePort} node dist/rsc/index.js`,
      cwd: '../remote',
      port: remotePort,
      reuseExistingServer: false,
    },
    {
      command: `npx serve . -l ${standalonePort} --no-clipboard`,
      port: standalonePort,
      reuseExistingServer: false,
    },
  ],
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
})
