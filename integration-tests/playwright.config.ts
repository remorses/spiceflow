import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 6174);
const isStart = Boolean(process.env.E2E_START);
const command = isStart
	? `PORT=${port} pnpm start`
	: `pnpm dev --port ${port} --strict-port`;

export default defineConfig({
	testDir: "e2e",
	use: {
		actionTimeout: 5000,
		navigationTimeout: 5000,
		trace: "on-first-retry",
  },

	projects: [
		{
      name: "chromium",

			use: {
				...devices["Desktop Chrome"],
				viewport: null,
				deviceScaleFactor: undefined,
			},
		},
	],
	webServer: {
		command,
		stdout: 'pipe',
		stderr: 'pipe',
		port,
	},
	fullyParallel: false,
	workers: 1,
	grepInvert: isStart ? /@dev/ : /@build/,
	forbidOnly: !!process.env["CI"],

	retries: process.env["CI"] ? 2 : 0,
	reporter: "list",
});
