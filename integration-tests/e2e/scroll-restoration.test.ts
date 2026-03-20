import { expect, test } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 6174);
const baseURL = `http://localhost:${port}`;

test.describe("scroll restoration", () => {
	test("scrolls to top on PUSH navigation", async ({ page }) => {
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Navigate to page A using layout link
		await page.getByRole("link", { name: "Scroll A" }).click();
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();

		// Scroll down on page A
		await page.evaluate(() => window.scrollTo(0, 1000));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(500);

		// Navigate to page B via Link in layout nav (PUSH)
		await page.getByRole("link", { name: "Scroll B" }).click();
		await expect(page.getByRole("heading", { name: "Page B" })).toBeVisible();

		// Should scroll to top
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBe(0);
	});

	test("restores scroll position on back navigation (POP)", async ({ page }) => {
		// Start from home to ensure proper hydration and SPA navigation
		await page.goto("/");
		await page.getByText("[hydrated: 1]").click();

		// Navigate to page A via layout Link
		await page.getByRole("link", { name: "Scroll A" }).click();
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

		// Scroll down and wait for scroll event to register
		await page.evaluate(() => window.scrollTo(0, 1200));
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

		// Navigate to page B via layout Link (PUSH)
		await page.getByRole("link", { name: "Scroll B" }).click();
		await expect(page.getByRole("heading", { name: "Page B" })).toBeVisible();

		// Go back
		await page.goBack();
		await expect(page.getByRole("heading", { name: "Page A" })).toBeVisible();

		// Scroll should be restored near the saved position
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(1000);
	});

	test("scrolls to hash element on navigation", async ({ page }) => {
		await page.goto("/scroll-restoration/page-a#bottom");
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();

		// The #bottom element is at top: 2800px, hash in initial load should scroll to it
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(2000);

		await expect(page.getByTestId("scroll-bottom")).toBeVisible();
	});

	test("SSR HTML contains scroll restoration inline script", async () => {
		const response = await fetch(`${baseURL}/scroll-restoration/page-a`);
		const html = await response.text();
		expect(html).toContain("spiceflow-scroll-positions");
		expect(html).toContain("scrollRestoration");
	});
});
