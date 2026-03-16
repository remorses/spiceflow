import { type Page, expect, test, type APIRequestContext } from "@playwright/test";
import { createEditor } from "./helper.js";

const port = Number(process.env.E2E_PORT || 6174);
const baseURL = `http://localhost:${port}`;
const isPreview = Boolean(process.env.E2E_PREVIEW);

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

	test("unmatched route renders React 404 page for browser requests", async ({ page }) => {
		const response = await page.goto("/a/b/does-not-exist");
		expect(response?.status()).toBe(404);
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
	});

	test("unmatched route returns plain text for non-browser requests", async () => {
		const response = await fetch(`${baseURL}/a/b/does-not-exist`);
		expect(response.status).toBe(404);
		const text = await response.text();
		expect(text).toBe("Not Found");
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

	const file = createEditor("src/app/index.tsx");
	try {
		// edit server
		await file.edit((s) => s.replace("Server counter", "Server [EDIT] counter"));
		await page.getByText("Server [EDIT] counter: 1").click();

		// server -1
		await page
			.getByTestId("server-counter")
			.getByRole("button", { name: "-" })
			.click();
		await page.getByText("Server [EDIT] counter: 0").click();
	} finally {
		file[Symbol.dispose]();
	}
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

test.describe("status codes", () => {
	test("sync redirect returns correct status and Location header", async () => {
		const response = await fetch(`${baseURL}/top-level-redirect`, {
			redirect: "manual",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/");
	});

	test("sync not-found returns 404 status", async () => {
		const response = await fetch(`${baseURL}/not-found`);
		expect(response.status).toBe(404);
	});
});

test.describe("CSS loading", () => {
	test("global tailwind CSS is applied", async ({ page }) => {
		await page.goto("/css-test");
		const twEl = page.getByTestId("css-test-tailwind");
		await expect(twEl).toBeVisible();
		// Tailwind v4 uses oklch color space. Verify the computed color is not the default black.
		const color = await twEl.evaluate((el) => getComputedStyle(el).color);
		expect(color).not.toBe("rgb(0, 0, 0)");
		// Verify it contains green-ish oklch value from tailwind's text-green-600
		expect(color).toContain("oklch");
	});

	test("server component CSS is applied", async ({ page }) => {
		await page.goto("/css-test");
		const serverEl = page.getByTestId("css-test-server");
		await expect(serverEl).toBeVisible();
		const color = await serverEl.evaluate((el) => getComputedStyle(el).color);
		expect(color).toBe("rgb(37, 99, 235)");
		const border = await serverEl.evaluate((el) => getComputedStyle(el).borderColor);
		expect(border).toBe("rgb(37, 99, 235)");
	});

	test("client component CSS is applied", async ({ page }) => {
		await page.goto("/css-test");
		const clientEl = page.getByTestId("css-test-client");
		await expect(clientEl).toBeVisible();
		const color = await clientEl.evaluate((el) => getComputedStyle(el).color);
		expect(color).toBe("rgb(220, 38, 38)");
		const border = await clientEl.evaluate((el) => getComputedStyle(el).borderColor);
		expect(border).toBe("rgb(220, 38, 38)");
	});

	test("CSS is present in SSR HTML (no FOUC)", async () => {
		const response = await fetch(`${baseURL}/css-test`);
		const html = await response.text();
		// The HTML should contain stylesheet link tags
		expect(html).toContain('rel="stylesheet"');
	});

	test("CSS HMR updates styles without page reload @dev", async ({ page }) => {
		await page.goto("/css-test");
		const serverEl = page.getByTestId("css-test-server");
		await expect(serverEl).toBeVisible();

		// Verify initial color
		const initialColor = await serverEl.evaluate((el) => getComputedStyle(el).color);
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
});

test.describe("layout stability during navigation", () => {
	test("layout client component is not remounted on navigation", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		// Layout useEffect ran once on mount
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1");
		// Increment the layout counter to create client state we can track
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout counter" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await layoutCounter.getByText("Layout counter: 1").click();
		// Navigate to another page via client-side Link
		await page.getByRole("link", { name: "Other" }).click();
		await expect(page).toHaveURL("/other");
		// Layout mount count should still be 1 (useEffect did not re-run)
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1");
		// Layout counter state should be preserved (component was not remounted)
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
		// Navigate back to home
		await page.getByRole("link", { name: "Home" }).click();
		await expect(page).toHaveURL("/");
		// Still no remount
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1");
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
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
		if (isPreview) {
			await expect(page.getByTestId("stream-done")).toBeVisible({ timeout: 10000 });
			const items = page.getByTestId("stream-item");
			await expect(items).toHaveCount(3);
			await expect(items.nth(0)).toHaveText("message-1");
			await expect(items.nth(1)).toHaveText("message-2");
			await expect(items.nth(2)).toHaveText("message-3");
			return;
		}
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

test.describe("throw response status codes", () => {
	test("throw redirect in page returns 307 and Location header", async () => {
		const response = await fetch(`${baseURL}/throw-redirect-in-page`, {
			redirect: "manual",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/other");
	});

	test("throw redirect in layout returns 307 and Location header", async () => {
		const response = await fetch(`${baseURL}/throw-redirect-in-layout`, {
			redirect: "manual",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/other");
	});

	test("throw redirect after async operation returns 307 and Location header", async () => {
		const response = await fetch(`${baseURL}/slow-redirect`, {
			redirect: "manual",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/");
	});

	test("throw redirect in layout child route returns 307", async () => {
		const response = await fetch(`${baseURL}/throw-redirect-in-layout/nested`, {
			redirect: "manual",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/other");
	});

	test("throw notFound in layout child route returns 404", async () => {
		const response = await fetch(`${baseURL}/throw-notfound-in-layout/nested`);
		expect(response.status).toBe(404);
	});

	test("throw notFound in page returns 404", async () => {
		const response = await fetch(`${baseURL}/throw-notfound-in-page`);
		expect(response.status).toBe(404);
	});

	test("throw notFound in layout returns 404", async () => {
		const response = await fetch(`${baseURL}/throw-notfound-in-layout`);
		expect(response.status).toBe(404);
	});

	test("throw notFound in page renders 404 page for browser request", async ({ page }) => {
		const response = await page.goto("/throw-notfound-in-page");
		expect(response?.status()).toBe(404);
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
	});

	test("throw notFound in layout renders 404 page for browser request", async ({ page }) => {
		const response = await page.goto("/throw-notfound-in-layout");
		expect(response?.status()).toBe(404);
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
	});
});

test.describe("client-side navigation with throw response", () => {
	test("throw redirect in page navigates to target", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-throw-redirect-page").click();
		await expect(page).toHaveURL("/other");
	});

	test("throw redirect in layout navigates to target", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-throw-redirect-layout").click();
		await expect(page).toHaveURL("/other");
	});

	test("throw notFound in page renders 404 page and preserves URL", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-throw-notfound-page").click();
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
		await expect(page).toHaveURL("/throw-notfound-in-page");
	});

	test("throw notFound in layout renders 404 page and preserves URL", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-throw-notfound-layout").click();
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
		await expect(page).toHaveURL("/throw-notfound-in-layout");
	});

	test("layout state is preserved after client-side redirect from page", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout counter" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
		await page.getByTestId("link-throw-redirect-page").click();
		await expect(page).toHaveURL("/other");
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
	});

	test("layout state is preserved after client-side redirect from layout", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout counter" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
		await page.getByTestId("link-throw-redirect-layout").click();
		await expect(page).toHaveURL("/other");
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();
	});
});

test.describe("deployment id @build", () => {
	const docHeaders = { "sec-fetch-dest": "document" };

	test("document response sets spiceflow-deployment cookie in prod", async () => {
		const response = await fetch(baseURL + "/", { headers: docHeaders });
		const setCookie = response.headers.get("set-cookie") ?? "";
		expect(setCookie).toContain("spiceflow-deployment=");
		const match = setCookie.match(/spiceflow-deployment=([^;]+)/);
		expect(match).toBeTruthy();
		expect(match![1].length).toBeGreaterThanOrEqual(4);
	});

	test("deployment id is stable across requests", async () => {
		const first = await fetch(baseURL + "/", { headers: docHeaders });
		const second = await fetch(baseURL + "/", { headers: docHeaders });
		const getId = (res: Response) =>
			res.headers.get("set-cookie")?.match(/spiceflow-deployment=([^;]+)/)?.[1];
		expect(getId(first)).toBeTruthy();
		expect(getId(first)).toBe(getId(second));
	});
});
