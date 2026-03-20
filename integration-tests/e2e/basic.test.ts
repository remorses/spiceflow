import { type Page, expect, test, type APIRequestContext } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 6174);
const baseURL = `http://localhost:${port}`;
const isStart = Boolean(process.env.E2E_START);

function getSetCookies(response: Response) {
	const headers = response.headers as Headers & { getSetCookie?: () => string[] };
	return headers.getSetCookie?.() ?? [];
}

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
test.describe("API route priority over layout-only matches", () => {
	// layout("/*") matches /api/hello but there's no page for it — the .get()
	// handler should execute instead of entering the React rendering path.
	test("GET /api/hello returns API response, not React 404", async () => {
		const response = await fetch(`${baseURL}/api/hello`);
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toContain("Hello from API!");
	});

	test("POST /api/echo returns API response when layout matches", async () => {
		const response = await fetch(`${baseURL}/api/echo`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ test: true }),
		});
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.echo).toEqual({ test: true });
	});

	test("GET /api/hello via browser returns API response, not React 404", async ({
		page,
	}) => {
		const response = await page.goto("/api/hello");
		expect(response?.status()).toBe(200);
		const text = await page.textContent("body");
		expect(text).toContain("Hello from API!");
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
	test("middleware receives SSR HTML response for browser requests", async () => {
		const response = await fetch(`${baseURL}/`, {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(response.headers.get("x-middleware-response-type")).toBe("text/html;charset=utf-8");
	});
	test("middleware receives RSC flight response for RSC requests", async () => {
		const response = await fetch(`${baseURL}/?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});
		expect(response.headers.get("x-middleware-response-type")).toBe("text/x-component;charset=utf-8");
	});
	test("api routes can set response headers through context.response", async () => {
		const response = await fetch(`${baseURL}/api/response-headers`);
		expect(response.status).toBe(200);
		expect(response.headers.get("x-api-header")).toBe("ok");
		expect(getSetCookies(response).join("\n")).toContain("api-cookie=1");
		expect(await response.json()).toEqual({ ok: true });
	});
});

test.describe("response headers from page and layout handlers", () => {
	test("document response includes page and layout headers", async () => {
		const response = await fetch(`${baseURL}/response-headers`, {
			headers: { "sec-fetch-dest": "document" },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("private, max-age=60");
		expect(response.headers.get("x-page-header")).toBe("page");
		expect(response.headers.get("x-layout-header")).toBe("layout");
		expect(getSetCookies(response).join("\n")).toContain("page-cookie=1");
	});

	test("rsc response includes page and layout headers", async () => {
		const response = await fetch(`${baseURL}/response-headers?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("private, max-age=60");
		expect(response.headers.get("x-page-header")).toBe("page");
		expect(response.headers.get("x-layout-header")).toBe("layout");
		expect(getSetCookies(response).join("\n")).toContain("page-cookie=1");
	});

	test("redirect response keeps cookies from route headers", async () => {
		const response = await fetch(`${baseURL}/response-headers/redirect`, {
			redirect: "manual",
			headers: { "sec-fetch-dest": "document" },
		});

		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("/response-target");
		expect(response.headers.get("x-layout-header")).toBe("layout");
		expect(getSetCookies(response).join("\n")).toContain("before-redirect=1");
	});

	test("client-side navigation applies cookies from the rsc response", async ({ page }) => {
		await page.goto("/response-nav");
		await page.getByTestId("response-nav-link").click();
		await expect(page.getByTestId("response-headers-page")).toBeVisible();

		const cookies = await page.context().cookies();
		expect(cookies.some((cookie) => cookie.name === "page-cookie")).toBe(true);
	});
});

test.describe("layout provided client context", () => {
	test("client context value is present in the SSR html", async () => {
		const response = await fetch(`${baseURL}/layout-client-context`, {
			headers: { "sec-fetch-dest": "document" },
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toContain("from-layout-client-provider");
	});

	test("client context value is available after client navigation", async ({ page }) => {
		await page.goto("/layout-client-context-nav");
		await page.getByTestId("layout-client-context-nav-link").click();
		await expect(page.getByTestId("layout-client-context-value")).toHaveText(
			"from-layout-client-provider",
		);
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

test("document SSR preinitializes client chunks for client references", async ({
	request,
}) => {
	const response = await request.get("/");
	expect(response.status()).toBe(200);
	const html = await response.text();

	expect(html).toContain('data-testid="client-counter"');
	expect(html).toContain('data-precedence="vite-rsc/client-reference"');
});

test("server reference in server @js", async ({ page }) => {
	await testServerAction(page);
});

test.describe(() => {
	test.use({ javaScriptEnabled: false });
	test("server reference in server @nojs", async ({ page }) => {
		await testServerAction(page);
	});

	test("progressive enhancement POST preserves client reference hints", async ({
		page,
	}) => {
		await page.goto("/");
		await page
			.getByTestId("server-counter")
			.getByRole("button", { name: "+" })
			.click();

		const html = await page.content();
		expect(html).toContain('data-testid="client-counter"');
		expect(html).toContain('data-precedence="vite-rsc/client-reference"');
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

test.describe("RSC client-only API errors @dev", () => {
	test("useState in server component shows actionable error message", async () => {
		const response = await fetch(`${baseURL}/usestate-in-rsc`, {
			headers: { accept: "text/html" },
		});
		expect(response.status).toBe(500);
		const html = await response.text();
		expect(html).toContain("useState only works in Client Components");
		expect(html).toContain("use client");
	});
});

test.describe("server component throws error", () => {
	test("returns 500 with __NO_HYDRATE and error in flight data", async () => {
		const response = await fetch(`${baseURL}/rsc-error`, {
			headers: { accept: "text/html" },
		});
		expect(response.status).toBe(500);
		const html = await response.text();
		expect(html).toContain("__NO_HYDRATE");
		expect(html).toContain("<noscript>500<!-- --> Internal Server Error</noscript>");
		expect(html).toContain("Server component error");
	});

	test("dev shows vite error overlay with error message @dev", async ({ page }) => {
		await page.goto("/rsc-error");
		const hasFlag = await page.evaluate(() => "__NO_HYDRATE" in globalThis);
		expect(hasFlag).toBe(true);
		// In dev, ErrorBoundary rethrows → window.onerror → vite-error-overlay
		const overlay = page.locator("vite-error-overlay");
		await expect(overlay).toBeAttached();
		const overlayText = await overlay.evaluate((el: Element) =>
			el.shadowRoot?.textContent ?? "",
		);
		expect(overlayText).toContain("Server component error");
	});
});

test.describe("client component throws during render (SSR)", () => {
	test("returns 500 with __NO_HYDRATE", async () => {
		// ClientComponentThrows throws unconditionally. RSC succeeds (it's a client
		// reference), but SSR fails when rendering the component on the server.
		const response = await fetch(`${baseURL}/client-error`, {
			headers: { accept: "text/html" },
		});
		expect(response.status).toBe(500);
		const html = await response.text();
		expect(html).toContain("__NO_HYDRATE");
		expect(html).toContain("<noscript>500<!-- --> Internal Server Error</noscript>");
	});

	test("dev shows vite error overlay with error message @dev", async ({ page }) => {
		await page.goto("/client-error");
		const overlay = page.locator("vite-error-overlay");
		await expect(overlay).toBeAttached();
		const overlayText = await overlay.evaluate((el: Element) =>
			el.shadowRoot?.textContent ?? "",
		);
		expect(overlayText).toContain("Client component error");
	});

	test("browser recovers via CSR when client component only throws during SSR", async ({ page }) => {
		// ThrowsDuringSSR only throws on the server (typeof window === 'undefined').
		// The __NO_HYDRATE fallback uses createRoot, so the component renders
		// successfully in the browser without hydration mismatch.
		await page.goto("/ssr-error-fallback");
		await expect(page.getByTestId("ssr-recovered")).toContainText("Recovered via CSR");
		const hasFlag = await page.evaluate(() => "__NO_HYDRATE" in globalThis);
		expect(hasFlag).toBe(true);
		// The layout shell is fully rendered by the browser — proves CSR recovery works
		await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
		await expect(page.getByRole("link", { name: "Other" })).toBeVisible();
	});
});

test.describe("route handler returns Error (not throws)", () => {
	test("API route returning Error behaves like throwing it (500)", async () => {
		const response = await fetch(`${baseURL}/api/returns-error`);
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.message).toBe("api handler returned an error");
	});

	test("API route returning Error with status property uses that status", async () => {
		const response = await fetch(`${baseURL}/api/returns-error-with-status`);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.message).toBe("bad request");
		expect(body.status).toBe(400);
	});

	test("page handler returning Error shows error shell like thrown errors", async () => {
		const response = await fetch(`${baseURL}/page-returns-error`, {
			headers: { accept: "text/html" },
		});
		expect(response.status).toBe(500);
		const html = await response.text();
		expect(html).toContain("__NO_HYDRATE");
		expect(html).toContain("500<!-- --> Internal Server Error");
		expect(html).toContain("page handler returned an error");
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
		// In dev, client component CSS loads async via Vite's HMR style injection
		// (the element is SSR'd before client JS injects the <style> tag).
		// toHaveCSS auto-retries until the style is applied.
		await expect(clientEl).toHaveCSS("color", "rgb(220, 38, 38)");
		await expect(clientEl).toHaveCSS("border-color", "rgb(220, 38, 38)");
	});

	test("CSS is present in SSR HTML (no FOUC)", async () => {
		const response = await fetch(`${baseURL}/css-test`);
		const html = await response.text();
		// The HTML should contain stylesheet link tags
		expect(html).toContain('rel="stylesheet"');
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

test.describe("slow throw response (>50ms) still works via client-side fallback", () => {
	test("slow redirect navigates to target via client-side", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-slow-redirect").click();
		await expect(page).toHaveURL("/");
	});

	test("slow notFound renders 404 page via client-side", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();
		await page.getByTestId("link-slow-notfound").click();
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();
		await expect(page).toHaveURL("/slow-notfound");
	});
});

test.describe("soft 404 during client-side navigation (no hard reload)", () => {
	test("layout state is preserved when navigating to a 404 page", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Create layout state we can track
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout counter" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();

		// Set a sentinel to detect full page reloads
		await page.evaluate(() => { (window as any).__softNavSentinel = true });

		// Navigate to a route that throws notFound() — should be a soft navigation
		await page.getByTestId("link-throw-notfound-page").click();
		await expect(page.getByText("404")).toBeVisible();
		await expect(page.getByText("This page could not be found.")).toBeVisible();

		// Layout state should be preserved (no hard reload happened)
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();

		// Sentinel should still be present — proves no full page reload
		const sentinel = await page.evaluate(() => (window as any).__softNavSentinel);
		expect(sentinel).toBe(true);
	});

	test("can navigate away from 404 page back to a working page", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Navigate to 404 page
		await page.getByTestId("link-throw-notfound-page").click();
		await expect(page.getByText("404")).toBeVisible();

		// Navigate back to home — should work without a hard reload
		await page.getByRole("link", { name: "Home" }).click();
		await expect(page).toHaveURL("/");
		await expect(page.getByText("Server counter:")).toBeVisible();
	});
});

test.describe("soft server error during client-side navigation", () => {
	test("layout state is preserved when navigating to a page with server error @build", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Create layout state we can track
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout counter" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();

		// Set a sentinel to detect full page reloads
		await page.evaluate(() => { (window as any).__softNavSentinel = true });

		// Navigate to a page that throws a server error
		await page.getByTestId("link-rsc-error").click();

		// Should show an error state in the error boundary, not a hard reload.
		// The error from the flight stream doesn't carry __REACT_SERVER_ERROR__ digest,
		// so the inner error boundary renders the inline error page.
		await expect(page.getByText("Application Error")).toBeVisible({ timeout: 5000 });

		// Layout state should be preserved
		await expect(layoutCounter.getByText("Layout counter: 1")).toBeVisible();

		// Sentinel should still be present
		const sentinel = await page.evaluate(() => (window as any).__softNavSentinel);
		expect(sentinel).toBe(true);
	});
});

test.describe("navigation abort controller", () => {
	test("rapid navigation aborts the stale RSC fetch", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Track RSC requests and their outcomes
		const rscRequests: { url: string; aborted: boolean }[] = [];
		page.on("requestfailed", (req) => {
			if (req.url().includes("__rsc")) {
				rscRequests.push({ url: req.url(), aborted: req.failure()?.errorText === "net::ERR_ABORTED" });
			}
		});
		page.on("requestfinished", (req) => {
			if (req.url().includes("__rsc")) {
				rscRequests.push({ url: req.url(), aborted: false });
			}
		});

		// Navigate to slow page (100ms delay), then immediately navigate to /other.
		await page.getByRole("link", { name: "slow page" }).click();
		await page.getByRole("link", { name: "Other" }).click();

		// Should land on /other
		await expect(page).toHaveURL("/other");
		// Wait for any in-flight requests to settle
		await page.waitForTimeout(300);
		await expect(page).toHaveURL("/other");

		// The slow page RSC fetch should have been aborted
		const slowRequest = rscRequests.find((r) => r.url.includes("/slow"));
		expect(slowRequest).toBeTruthy();
		expect(slowRequest!.aborted).toBe(true);

		// The /other RSC fetch should have completed normally
		const otherRequest = rscRequests.find((r) => r.url.includes("/other"));
		expect(otherRequest).toBeTruthy();
		expect(otherRequest!.aborted).toBe(false);
	});
});

test.describe("error boundary auto-reset on navigation", () => {
	test("error boundary clears when navigating to a new page @build", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Navigate to a page with a server error to trigger the error boundary
		await page.getByTestId("link-rsc-error").click();
		await expect(page.getByText("Application Error")).toBeVisible({ timeout: 5000 });

		// Navigate back to home — error boundary should auto-reset
		await page.getByRole("link", { name: "Home" }).click();
		await expect(page).toHaveURL("/");

		// The error should be gone and normal content should appear
		await expect(page.getByText("Application Error")).not.toBeVisible();
		await expect(page.getByText("Server counter:")).toBeVisible();
	});
});

// Strip non-deterministic parts from RSC/HTML output for stable snapshots:
// client reference IDs (hex hashes) and Vite asset filename hashes.
function stabilize(content: string) {
	return content
		.replace(/I\["[a-f0-9]+"/g, 'I["<REF>"')
		.replace(/\/assets\/([a-zA-Z_-]+)-[a-zA-Z0-9_-]+\.(css|js)/g, "/assets/$1-<HASH>.$2")
		.replace(/id="_R[a-zA-Z0-9_]*"/g, 'id="_R"')
		.replace(/<script id="_R[a-zA-Z0-9_]*">/g, '<script id="_R">')
		.replace(/import\("[^"]*"\)/g, 'import("<ENTRY>")')
		.replace(/(self\.__FLIGHT_DATA\|\|=\[\])\.push\("[^"]*"\)/g, "$1.push(<FLIGHT_CHUNK>)");
}

test.describe("prerender", () => {
	test("staticPage renders correctly", async ({ page }) => {
		await page.goto("/static/one");
		await expect(page.getByTestId("static-page")).toBeVisible();
		await expect(page.getByText("This is a static page with id one")).toBeVisible();
	});

	test("staticPage renders with different id", async ({ page }) => {
		await page.goto("/static/two");
		await expect(page.getByTestId("static-page")).toBeVisible();
		await expect(page.getByText("This is a static page with id two")).toBeVisible();
	});

	test("client navigation to staticPage works", async ({ page }) => {
		await page.goto("/prerender-nav");
		await page.getByTestId("link-static-one").click();
		await expect(page.getByTestId("static-page")).toBeVisible();
		await expect(page.getByText("This is a static page with id one")).toBeVisible();
	});
});

test.describe("prerender css", () => {
	test("prerendered page has imported CSS applied", async ({ page }) => {
		await page.goto("/static/one");
		const el = page.getByTestId("static-page");
		await expect(el).toBeVisible();
		await expect(el).toHaveCSS("color", "rgb(22, 163, 74)");
		await expect(el).toHaveCSS("border-color", "rgb(22, 163, 74)");
		await expect(el).toHaveCSS("padding", "12px");
	});

	test("CSS is applied after client navigation to prerendered page", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Server counter:")).toBeVisible();
		// Navigate to a prerendered page via client-side link
		await page.goto("/prerender-nav");
		await page.getByTestId("link-static-one").click();
		const el = page.getByTestId("static-page");
		await expect(el).toBeVisible();
		await expect(el).toHaveCSS("color", "rgb(22, 163, 74)");
		await expect(el).toHaveCSS("border-color", "rgb(22, 163, 74)");
		await expect(el).toHaveCSS("padding", "12px");
	});
});

test.describe("prerender @build", () => {
	test("prerendered RSC data is served for staticPage", async () => {
		const response = await fetch(baseURL + "/static/one?__rsc=");
		expect(response.status).toBe(200);
		const contentType = response.headers.get("content-type") ?? "";
		expect(contentType).toContain("text/x-component");
	});

	test("prerendered .rsc file content", async () => {
		const fs = await import("node:fs");
		const raw = fs.readFileSync("dist/client/static/one.rsc", "utf-8");
		// Write to file for debugging instead of snapshots that break on unrelated changes
		fs.writeFileSync("test-results/prerendered-rsc-flight-data.txt", stabilize(raw));
		expect(raw.length).toBeGreaterThan(0);
		expect(raw).toContain("static page with id");
	});

	test("prerendered page HTML", async () => {
		const fs = await import("node:fs");
		const response = await fetch(baseURL + "/static/one", {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(response.status).toBe(200);
		const html = await response.text();
		// Write to file for debugging instead of snapshots that break on unrelated changes
		fs.writeFileSync("test-results/prerendered-page-html.txt", stabilize(html));
		expect(html).toContain("static page with id");
		expect(html).toContain("</html>");
	});
});

test.describe("middleware page cache", () => {
	// Clear cache before each test so they're isolated
	test.beforeEach(async () => {
		await fetch(`${baseURL}/api/cache-clear`);
	});

	test("first HTML request is MISS, second is HIT with identical content", async () => {
		const first = await fetch(`${baseURL}/cached-page`, {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(first.status).toBe(200);
		expect(first.headers.get("x-cache")).toBe("MISS");
		const firstHtml = await first.text();

		const second = await fetch(`${baseURL}/cached-page`, {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(second.status).toBe(200);
		expect(second.headers.get("x-cache")).toBe("HIT");
		const secondHtml = await second.text();

		expect(secondHtml).toBe(firstHtml);
	});

	test("first RSC request is MISS, second is HIT with identical payload", async () => {
		const first = await fetch(`${baseURL}/cached-page?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});
		expect(first.status).toBe(200);
		expect(first.headers.get("x-cache")).toBe("MISS");
		const firstPayload = await first.text();

		const second = await fetch(`${baseURL}/cached-page?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});
		expect(second.status).toBe(200);
		expect(second.headers.get("x-cache")).toBe("HIT");
		const secondPayload = await second.text();

		expect(secondPayload).toBe(firstPayload);
	});

	test("HTML and RSC caches are separate (different cache keys)", async () => {
		const html = await fetch(`${baseURL}/cached-page`, {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(html.headers.get("x-cache")).toBe("MISS");

		const rsc = await fetch(`${baseURL}/cached-page?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});
		expect(rsc.headers.get("x-cache")).toBe("MISS");

		const htmlAgain = await fetch(`${baseURL}/cached-page`, {
			headers: { "sec-fetch-dest": "document" },
		});
		expect(htmlAgain.headers.get("x-cache")).toBe("HIT");

		const rscAgain = await fetch(`${baseURL}/cached-page?__rsc=1`, {
			headers: { accept: "text/x-component" },
		});
		expect(rscAgain.headers.get("x-cache")).toBe("HIT");
	});

	test("cached page renders correctly in browser", async ({ page }) => {
		await page.goto("/cached-page");
		await expect(page.getByTestId("cached-page")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Cached Page" })).toBeVisible();
		await expect(page.getByTestId("cached-render-count")).toHaveText("1");
	});

	test("cached page serves same content on reload (render count stays 1)", async ({ page }) => {
		await page.goto("/cached-page");
		await expect(page.getByTestId("cached-render-count")).toHaveText("1");
		const firstRandom = await page.getByTestId("cached-random").textContent();

		await page.reload();
		await expect(page.getByTestId("cached-render-count")).toHaveText("1");
		const secondRandom = await page.getByTestId("cached-random").textContent();
		expect(secondRandom).toBe(firstRandom);
	});

	test("client-side navigation to cached page returns cached RSC payload", async ({ page }) => {
		// Start on home — has [hydrated: 1] marker for confirming JS is ready
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// First client-side nav to cached page — should be MISS (primes RSC cache)
		let rscResponsePromise = page.waitForResponse(
			(res) => res.url().includes("cached-page") && res.url().includes("__rsc"),
		);
		await page.getByTestId("link-cached-page").click();
		let rscResponse = await rscResponsePromise;
		expect(rscResponse.headers()["x-cache"]).toBe("MISS");
		await expect(page.getByTestId("cached-page")).toBeVisible();
		const primeRandom = await page.getByTestId("cached-random").textContent();

		// Navigate back home
		await page.getByTestId("cached-page-home-link").click();
		await expect(page).toHaveURL("/");

		// Second client-side nav — should be HIT
		rscResponsePromise = page.waitForResponse(
			(res) => res.url().includes("cached-page") && res.url().includes("__rsc"),
		);
		await page.getByTestId("link-cached-page").click();
		rscResponse = await rscResponsePromise;
		expect(rscResponse.headers()["x-cache"]).toBe("HIT");

		// Content should match what was cached (same random value)
		await expect(page.getByTestId("cached-page")).toBeVisible();
		const navRandom = await page.getByTestId("cached-random").textContent();
		expect(navRandom).toBe(primeRandom);
	});

	test("client-side nav from layout link uses cached RSC payload", async ({ page }) => {
		// Start on home page
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// First client-side nav — primes RSC cache (MISS)
		let rscResponsePromise = page.waitForResponse(
			(res) => res.url().includes("cached-page") && res.url().includes("__rsc"),
		);
		await page.getByTestId("link-cached-page").click();
		let rscResponse = await rscResponsePromise;
		expect(rscResponse.headers()["x-cache"]).toBe("MISS");
		await expect(page.getByTestId("cached-page")).toBeVisible();

		// Navigate back home
		await page.getByRole("link", { name: "Home", exact: true }).click();
		await expect(page).toHaveURL("/");

		// Second nav — should be HIT
		rscResponsePromise = page.waitForResponse(
			(res) => res.url().includes("cached-page") && res.url().includes("__rsc"),
		);
		await page.getByTestId("link-cached-page").click();
		rscResponse = await rscResponsePromise;
		expect(rscResponse.headers()["x-cache"]).toBe("HIT");

		await expect(page.getByTestId("cached-page")).toBeVisible();
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

test.describe("server actions", () => {
	test("simple server action called from client returns value", async ({ page }) => {
		await page.goto("/server-action-simple");
		// Wait for hydration (layout mount tracker increments from 0 to 1)
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		await page.getByTestId("call-simple-action").click();
		await expect(page.getByTestId("simple-action-result")).toHaveText(
			"echo: hello",
			{ timeout: 10000 },
		);
	});

	test("server action returning async generator streams items incrementally", async ({ page }) => {
		await page.goto("/server-action-streaming");
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		await page.getByTestId("start-streaming").click();
		// First item should appear before the generator completes
		const firstItem = page.getByTestId("action-stream-item").first();
		await expect(firstItem).toBeVisible({ timeout: 10000 });
		await expect(firstItem).toHaveText("chunk-1");
		// Wait for completion
		await expect(page.getByTestId("action-stream-done")).toBeVisible({
			timeout: 10000,
		});
		const items = page.getByTestId("action-stream-item");
		await expect(items).toHaveCount(3);
		await expect(items.nth(0)).toHaveText("chunk-1");
		await expect(items.nth(1)).toHaveText("chunk-2");
		await expect(items.nth(2)).toHaveText("chunk-3");
	});

	test("form action with useActionState submits and returns result", async ({
		page,
	}) => {
		await page.goto("/form");
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		await page.locator('input[name="name"]').fill("test");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect(page.locator("pre")).toContainText('"result":"ok"', {
			timeout: 10000,
		});
	});

	test("server action called directly preserves client component state", async ({ page }) => {
		await page.goto("/server-action-simple");
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		// Increment the layout counter to set some client state
		const layoutCounter = page.getByTestId("client-counter").filter({ hasText: "Layout" });
		await layoutCounter.getByRole("button", { name: "+" }).click();
		await expect(layoutCounter).toContainText("Layout counter: 1");
		// Call the server action
		await page.getByTestId("call-simple-action").click();
		await expect(page.getByTestId("simple-action-result")).toHaveText(
			"echo: hello",
			{ timeout: 10000 },
		);
		// Layout counter state should be preserved after server action
		await expect(layoutCounter).toContainText("Layout counter: 1");
	});

	test("throw redirect() in server action navigates to target", async ({ page }) => {
		await page.goto("/form-redirect");
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		await page.locator('input[name="name"]').fill("test");
		await page.getByRole("button", { name: "Submit" }).click();
		await expect(page).toHaveURL("/", { timeout: 10000 });
	});

	test("throw Error in server action propagates to client", async ({ page }) => {
		const errors: string[] = [];
		page.on("pageerror", (err) => errors.push(err.message));
		await page.goto("/form-error");
		await expect(page.getByTestId("layout-mount-count")).toHaveText("1", { timeout: 10000 });
		await page.locator('input[name="name"]').fill("test");
		await page.getByRole("button", { name: "Submit" }).click();
		await page.waitForTimeout(2000);
		// The error reaches the client as a pageerror or shows in the error boundary
		const bodyText = await page.evaluate(() => document.body.textContent ?? "");
		const hasError =
			bodyText.includes("test error") ||
			bodyText.includes("Application Error") ||
			errors.some((e) => e.includes("test error"));
		expect(hasError).toBe(true);
	});
});
