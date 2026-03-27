import { defineConfig, devices } from "@playwright/test";
import { createServer, type AddressInfo } from "node:net";

function getFreePort(): Promise<number> {
	return new Promise((resolve) => {
		const server = createServer();
		server.listen(0, () => {
			const port = (server.address() as AddressInfo).port;
			server.close(() => resolve(port));
		});
	});
}

// When E2E_BASE_URL is set, tests run against an external deployment (e.g. Vercel)
// and no local server is started.
const externalBaseURL = process.env.E2E_BASE_URL;

const port = externalBaseURL
	? 0
	: Number(process.env.E2E_PORT) || (await getFreePort());
process.env.E2E_PORT = String(port);

const isStart = Boolean(process.env.E2E_START) || Boolean(externalBaseURL);
const command = isStart
	? `PORT=${port} pnpm start`
	: `pnpm dev --port ${port} --strict-port`;

export default defineConfig({
	testDir: "e2e",
	use: {
		baseURL: externalBaseURL || `http://localhost:${port}`,
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
	webServer: externalBaseURL
		? undefined
		: {
				command,
				stdout: "pipe",
				stderr: "pipe",
				port,
			},
	fullyParallel: false,
	workers: 1,
	grepInvert: isStart ? /@dev/ : /@build/,
	forbidOnly: !!process.env["CI"],

	retries: process.env["CI"] ? 2 : 0,
	reporter: "list",
});
