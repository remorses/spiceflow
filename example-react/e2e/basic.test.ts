import { type Page, expect, test } from "@playwright/test";
import { createEditor } from "./helper.js";

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
	await page.getByText("Client counter: 0").click();
	await page
		.getByTestId("client-counter")
		.getByRole("button", { name: "+" })
		.click();
	await page.getByText("Client counter: 1").click();
	await page.reload();
	await page.getByText("Client counter: 0").click();
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
	// client +1
	await page.getByText("Client counter: 0").click();
	await page
		.getByTestId("client-counter")
		.getByRole("button", { name: "+" })
		.click();
	await page.getByText("Client counter: 1").click();
	// edit client
	using file = createEditor("src/app/client.tsx");
	file.edit((s) => s.replace("Client counter", "Client [EDIT] counter"));
	await page.getByText("Client [EDIT] counter: 1").click();
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
	await page.getByText("Client counter: 0").click();
	await page
		.getByTestId("client-counter")
		.getByRole("button", { name: "+" })
		.click();
	await page.getByText("Client counter: 1").click();

	// edit server
	using file = createEditor("src/app/index.tsx");
	await file.edit((s) => s.replace("Server counter", "Server [EDIT] counter"));
	await page.getByText("Server [EDIT] counter: 1").click();
	await page.getByText("Client counter: 1").click();

	// server -1
	await page
		.getByTestId("server-counter")
		.getByRole("button", { name: "-" })
		.click();
	await page.getByText("Server [EDIT] counter: 0").click();
});
