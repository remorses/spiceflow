// HMR integration tests for client, server, and CSS hot module replacement.
import { expect, test } from "@playwright/test";
import { createEditor } from "./helper.js";

test("client hmr @dev", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();
	const clientCounter = page
		.getByTestId("client-counter")
		.filter({ hasText: "Client counter" });
	// client +1
	await clientCounter.getByRole("button", { name: "+" }).click();
	await clientCounter.getByText("Client counter: 1").click();
	// Record the server render count before the client edit
	const renderCountBefore = await page
		.getByTestId("server-render-count")
		.textContent();
	// edit client — replace the default prop value in client.tsx.
	// Client HMR should NOT trigger a server re-render. Only the client module
	// should hot-update, preserving client state and avoiding an SSR page reload.
	const file = createEditor("src/app/client.tsx");
	try {
		await file.edit((s) =>
			s.replace('name = "Client"', 'name = "Client [EDIT]"'),
		);
		// Verify edited text appears with preserved state (counter stays at 1).
		// If a full page reload happened, state would reset to 0.
		await expect(page.getByText("Client [EDIT] counter: 1")).toBeVisible();
		// Wait to ensure any delayed server re-render would have completed
		await page.waitForTimeout(500);
		// Server render count must not have changed — no server re-render happened
		const renderCountAfter = await page
			.getByTestId("server-render-count")
			.textContent();
		expect(renderCountAfter).toBe(renderCountBefore);
	} finally {
		file[Symbol.dispose]();
	}
});

test("server hmr @dev", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();

	const serverCounter = page.getByTestId("server-counter");
	const getServerCount = async (label: string) => {
		const text = await serverCounter.textContent();
		const match = text?.match(new RegExp(`${label}: (\\d+)`));
		expect(match?.[1]).toBeTruthy();
		return Number(match![1]);
	};

	const initialServerCount = await getServerCount("Server counter");

	// server +1
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "+" })
		.click();
	await expect(serverCounter).toContainText(
		`Server counter: ${initialServerCount + 1}`,
	);

	// client +1
	const clientCounter = page
		.getByTestId("client-counter")
		.filter({ hasText: "Client counter" });
	await clientCounter.getByText("Client counter: 0").click();
	await clientCounter.getByRole("button", { name: "+" }).click();
	await clientCounter.getByText("Client counter: 1").click();

	const file = createEditor("src/app/index.tsx");
	try {
		// edit server
		await file.edit((s) =>
			s.replace("Server counter", "Server [EDIT] counter"),
		);
		await expect(serverCounter).toContainText(
			`Server [EDIT] counter: ${initialServerCount + 1}`,
		);

		// server -1
		await page
			.getByTestId("server-counter")
			.getByRole("button", { name: "-" })
			.click();
		await expect(serverCounter).toContainText(
			`Server [EDIT] counter: ${initialServerCount}`,
		);
	} finally {
		file[Symbol.dispose]();
	}
});

test("main entry hmr does not trigger full reload @dev", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();

	// Set a sentinel on window — a full page reload would clear it
	const sentinel = Math.random().toString(36).slice(2);
	await page.evaluate((s) => {
		(window as any).__hmrSentinel = s;
	}, sentinel);

	const file = createEditor("src/main.tsx");
	try {
		// Modify the serverRandom computation so "server random:" text changes.
		// This proves the RSC environment picked up the new code via HMR.
		await file.edit((s) =>
			s.replace(
				"const serverRandom = Math.random()",
				'const serverRandom = "EDITED-" + Math.random()',
			),
		);
		// Wait for RSC HMR to re-render
		await expect(page.getByText("server random: EDITED-")).toBeVisible({
			timeout: 10000,
		});
		// Sentinel must still be present — proves no full page reload happened
		const value = await page.evaluate(() => (window as any).__hmrSentinel);
		expect(value).toBe(sentinel);
	} finally {
		file[Symbol.dispose]();
	}
});

test("CSS HMR updates styles without page reload @dev", async ({ page }) => {
	await page.goto("/css-test");
	const serverEl = page.getByTestId("css-test-server");
	await expect(serverEl).toBeVisible();

	// Verify initial color
	const initialColor = await serverEl.evaluate(
		(el) => getComputedStyle(el).color,
	);
	expect(initialColor).toBe("rgb(37, 99, 235)");

	// Edit the server-styles.css to change color
	const file = createEditor("src/app/server-styles.css");
	try {
		await file.edit((s) => s.replace("rgb(37, 99, 235)", "rgb(234, 88, 12)"));
		// Wait for HMR to apply the new styles
		await expect(async () => {
			const color = await serverEl.evaluate((el) => getComputedStyle(el).color);
			expect(color).toBe("rgb(234, 88, 12)");
		}).toPass({ timeout: 10000 });
	} finally {
		file[Symbol.dispose]();
	}
});
