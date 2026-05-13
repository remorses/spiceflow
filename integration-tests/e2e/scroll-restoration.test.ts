import { expect, test } from "@playwright/test";

const basePath = process.env.BASEPATH || "";

function url(path: string): string {
	return basePath + path;
}

test.describe("scroll restoration", () => {
	test("scrolls to top on PUSH navigation", async ({ page }) => {
		await page.goto(url("/"), { waitUntil: "domcontentloaded" });
		await page.getByText("[hydrated: 1]").click();
		expect(await page.evaluate(() => window.history.scrollRestoration)).toBe(
			"manual",
		);

		// Navigate to page A using layout link
		await page.getByRole("link", { name: "Scroll A" }).click();
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();

		// Scroll down on page A
		await page.evaluate(() => window.scrollTo(0, 1000));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(500);

		// Navigate to page B via Link in layout nav (PUSH)
		await page.getByRole("link", { name: "Scroll B", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Page B" })).toBeVisible();

		// Should scroll to top
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
	});

	test("restores scroll position on back navigation (POP)", async ({
		page,
	}) => {
		// Start from home to ensure proper hydration and SPA navigation
		await page.goto(url("/"), { waitUntil: "domcontentloaded" });
		await page.getByText("[hydrated: 1]").click();

		// Navigate to page A via layout Link
		await page.getByRole("link", { name: "Scroll A" }).click();
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

		// Scroll down and wait for scroll event to register
		await page.evaluate(() => window.scrollTo(0, 1200));
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(1000);

		// Navigate with a link that is already visible at the saved scroll position.
		await page.getByRole("link", { name: "Scroll B from middle" }).click();
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
		await page.goto(url("/scroll-restoration/page-a#bottom"));
		await expect(page.getByTestId("scroll-test-page")).toBeVisible();

		// The #bottom element is at top: 2800px, hash in initial load should scroll to it
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeGreaterThan(2000);

		await expect(page.getByTestId("scroll-bottom")).toBeVisible();
	});

});
