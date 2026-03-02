import { type Page, expect, test, type APIRequestContext } from "@playwright/test";
import { createEditor } from "./helper.js";

const port = Number(process.env.E2E_PORT || 6174);
const baseURL = `http://localhost:${port}`;

test.describe("not found", () => {
	test("not found in outer route scope", async ({ page }) => {
		await page.goto("/not-found");
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
	});

	test("not found in RSC inside suspense", async ({ page }) => {
		await page.goto("/not-found-in-suspense");
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
	});
});
test.describe("middleware with use()", () => {
	test("middleware sets response header", async ({ page }) => {
		const response = await page.goto("/");
		expect(response?.headers()["x-middleware-1"]).toBe("ok");
	});
	test("middleware sets state", async ({ page }) => {
		await page.goto("/state");
		await expect(page.getByText("state set by middleware1")).toBeVisible();
	});
});

test.describe("redirect", () => {
	test("redirect in outer route scope", async ({ page }) => {
		await page.goto("/top-level-redirect");
		await expect(page).toHaveURL("/");
		await page.getByText("[hydrated: 1]").click();
	});
	test("redirect in RSC", async ({ page }) => {
		await page.goto("/redirect-in-rsc");
		await expect(page).toHaveURL("/");
		await page.getByText("[hydrated: 1]").click();
	});
	test("redirect in RSC, slow (meaning not first rsc chunk)", async ({
		page,
	}) => {
		await page.goto("/slow-redirect");
		await expect(page).toHaveURL("/");
		await page.getByText("[hydrated: 1]").click();
	});
	test("redirect in RSC inside suspense, redirect made by client", async ({
		page,
	}) => {
		await page.goto("/redirect-in-rsc-suspense");
		await expect(page).toHaveURL("/");
		await page.getByText("[hydrated: 1]").click();
	});
});

test("client reference", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();
	const clientCounter = page.getByTestId("client-counter").filter({ hasText: "Client counter" });
	await clientCounter.getByText("Client counter: 0").click();
	await clientCounter.getByRole("button", { name: "+" }).click();
	await clientCounter.getByText("Client counter: 1").click();
	await page.reload();
	await clientCounter.getByText("Client counter: 0").click();
});

test("server reference in server @js", async ({ page }) => {
	await testServerAction(page);
});

test.describe(() => {
	test.use({ javaScriptEnabled: false });
	test("server reference in server @nojs", async ({ page }) => {
		await testServerAction(page);
	});
});

async function testServerAction(page: Page) {
	await page.goto("/");
	await page.getByText("Server counter: 0").click();
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "+" })
		.click();
	await page.getByText("Server counter: 1").click();
	await page.goto("/");
	await page.getByText("Server counter: 1").click();
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "-" })
		.click();
	await page.getByText("Server counter: 0").click();
}

test("server reference in client @js", async ({ page }) => {
	await testServerAction2(page, { js: true });
});

test.describe(() => {
	test.use({ javaScriptEnabled: false });
	test.skip("server reference in client @nojs", async ({ page }) => {
		await testServerAction2(page, { js: false });
	});
});

async function testServerAction2(page: Page, options: { js: boolean }) {
	await page.goto("/");
	if (options.js) {
		await page.getByText("[hydrated: 1]").click();
	}
	await page.locator('input[name="x"]').fill("2");
	await page.locator('input[name="y"]').fill("3");
	await page.locator('input[name="y"]').press("Enter");
	await expect(page.getByTestId("calculator-answer")).toContainText("5");
	await page.locator('input[name="x"]').fill("2");
	await page.locator('input[name="y"]').fill("three");
	await page.locator('input[name="y"]').press("Enter");
	await expect(page.getByTestId("calculator-answer")).toContainText(
		"(invalid input)",
	);
	if (options.js) {
		await expect(page.locator('input[name="x"]')).toHaveValue("2");
		await expect(page.locator('input[name="y"]')).toHaveValue("three");
	} else {
		await expect(page.locator('input[name="x"]')).toHaveValue("");
		await expect(page.locator('input[name="y"]')).toHaveValue("");
	}
}

test("client hmr @dev", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();
	const clientCounter = page.getByTestId("client-counter").filter({ hasText: "Client counter" });
	// client +1
	await clientCounter.getByRole("button", { name: "+" }).click();
	await clientCounter.getByText("Client counter: 1").click();
	// Record the server render count before the client edit
	const renderCountBefore = await page.getByTestId("server-render-count").textContent();
	// edit client — replace the default prop value in client.tsx.
	// Client HMR should NOT trigger a server re-render. Only the client module
	// should hot-update, preserving client state and avoiding an SSR page reload.
	const file = createEditor("src/app/client.tsx");
	try {
		await file.edit((s) => s.replace('name = "Client"', 'name = "Client [EDIT]"'));
		// Verify edited text appears with preserved state (counter stays at 1).
		// If a full page reload happened, state would reset to 0.
		await expect(page.getByText("Client [EDIT] counter: 1")).toBeVisible();
		// Wait to ensure any delayed server re-render would have completed
		await page.waitForTimeout(2000);
		// Server render count must not have changed — no server re-render happened
		const renderCountAfter = await page.getByTestId("server-render-count").textContent();
		expect(renderCountAfter).toBe(renderCountBefore);
	} finally {
		file[Symbol.dispose]();
	}
});

test("server hmr @dev", async ({ page }) => {
	await page.goto("/");
	await page.getByText("[hydrated: 1]").click();

	// server +1
	await page.getByText("Server counter: 0").click();
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "+" })
		.click();
	await page.getByText("Server counter: 1").click();

	// client +1
	const clientCounter = page.getByTestId("client-counter").filter({ hasText: "Client counter" });
	await clientCounter.getByText("Client counter: 0").click();
	await clientCounter
		.getByRole("button", { name: "+" })
		.click();
	await clientCounter.getByText("Client counter: 1").click();

	// edit server
	const file = createEditor("src/app/index.tsx");
	await file.edit((s) => s.replace("Server counter", "Server [EDIT] counter"));
	await page.getByText("Server [EDIT] counter: 1").click();
	await clientCounter.getByText("Client counter: 1").click();

	// server -1
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "-" })
		.click();
	await page.getByText("Server [EDIT] counter: 0").click();
	file[Symbol.dispose]();
});

test.describe("SSR error fallback (__NO_HYDRATE)", () => {
	test("recovers via CSR when SSR fails", async ({ page }) => {
		await page.goto("/ssr-error-fallback");
		// The client component throws during SSR, so the server renders an error shell
		// with self.__NO_HYDRATE=1. The browser detects this and uses createRoot instead
		// of hydrateRoot, allowing the component to render successfully via CSR.
		await expect(page.getByTestId("ssr-recovered")).toContainText(
			"Recovered via CSR",
		);
	});

	test("sets __NO_HYDRATE flag on globalThis", async ({ page }) => {
		await page.goto("/ssr-error-fallback");
		// Wait for CSR recovery first — this confirms the bootstrap script ran
		await expect(page.getByTestId("ssr-recovered")).toBeVisible();
		// The bootstrap script set self.__NO_HYDRATE=1, which persists on globalThis
		const hasFlag = await page.evaluate(() => "__NO_HYDRATE" in globalThis);
		expect(hasFlag).toBe(true);
	});

	test("normal page HTML does not contain __NO_HYDRATE", async ({ request }) => {
		const response = await request.get(`${baseURL}/`);
		expect(response.status()).toBe(200);
		const html = await response.text();
		expect(html).not.toContain("__NO_HYDRATE");
	});
});

test.describe("CSRF protection", () => {
	test("cross-origin POST to action endpoint returns 403", async () => {
		// Use Node.js fetch directly — browser fetch cannot override the Origin header
		// (it's a forbidden header). Node.js fetch has no such restriction.
		const response = await fetch(`${baseURL}/?__rsc=fake-action-id`, {
			method: "POST",
			headers: { Origin: "https://evil.com" },
			body: "",
		});
		expect(response.status).toBe(403);
		expect(await response.text()).toContain("origin mismatch");
	});

	test("same-origin POST to action endpoint is not blocked by CSRF", async () => {
		const response = await fetch(`${baseURL}/?__rsc=fake-action-id`, {
			method: "POST",
			headers: { Origin: baseURL },
			body: "",
		});
		// Should not be 403 — the action ID is fake so it will fail for a different reason,
		// but the CSRF check should pass.
		expect(response.status).not.toBe(403);
	});
});

test.describe("streaming async generator", () => {
	test("client renders items incrementally before generator completes", async ({ page }) => {
		// Use waitUntil:'commit' so Playwright doesn't wait for the full streaming response
		await page.goto("/streaming", { waitUntil: "commit" });
		// First item should appear while the generator is still yielding
		const firstItem = page.getByTestId("stream-item").first();
		await expect(firstItem).toBeVisible({ timeout: 10000 });
		await expect(firstItem).toHaveText("message-1");
		// At this point the generator still has ~3s of work left (2 × 1500ms delays).
		// "done" marker must NOT be visible yet.
		expect(await page.getByTestId("stream-done").isVisible()).toBe(false);
		// Wait for all items to arrive
		await expect(page.getByTestId("stream-done")).toBeVisible({ timeout: 10000 });
		const items = page.getByTestId("stream-item");
		await expect(items).toHaveCount(3);
		await expect(items.nth(0)).toHaveText("message-1");
		await expect(items.nth(1)).toHaveText("message-2");
		await expect(items.nth(2)).toHaveText("message-3");
	});
});
