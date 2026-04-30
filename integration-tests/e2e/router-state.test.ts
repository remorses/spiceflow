import { expect, test } from "@playwright/test";

const basePath = process.env.BASEPATH || "";

function url(path: string): string {
	return basePath + path;
}

test("useRouterState exposes the request path during SSR and hydration", async ({
	page,
	request,
}) => {
	const response = await request.get(url("/router-state/deep"), {
		headers: { "sec-fetch-dest": "document" },
	});
	expect(response.status()).toBe(200);

	const html = await response.text();
	expect(html).toContain('data-testid="router-pathname"');
	expect(html).toContain("/router-state/deep");

	const hydrationMessages: string[] = [];
	page.on("console", (message) => {
		if (message.type() !== "error" && message.type() !== "warning") return;

		const text = message.text();
		if (
			text.includes("Hydration failed") ||
			text.includes("Text content did not match") ||
			text.includes("getServerSnapshot should be cached")
		) {
			hydrationMessages.push(text);
		}
	});
	page.on("pageerror", (error) => {
		const message = error.message;
		if (
			message.includes("Hydration failed") ||
			message.includes("getServerSnapshot should be cached")
		) {
			hydrationMessages.push(message);
		}
	});

	await page.goto(url("/router-state/deep"));
	await expect(page.getByTestId("router-pathname")).toHaveText(
		"/router-state/deep",
	);
	expect(hydrationMessages).toEqual([]);
});

test("useRouterState works when the client component comes from a package", async ({
	page,
	request,
}) => {
	const response = await request.get(url("/router-state/package"), {
		headers: { "sec-fetch-dest": "document" },
	});
	expect(response.status()).toBe(200);

	const html = await response.text();
	expect(html).toContain('data-testid="package-router-pathname"');
	expect(html).toContain("/router-state/package");

	const hydrationMessages: string[] = [];
	page.on("console", (message) => {
		if (message.type() !== "error" && message.type() !== "warning") return;

		const text = message.text();
		if (
			text.includes("Hydration failed") ||
			text.includes("Text content did not match") ||
			text.includes("getServerSnapshot should be cached")
		) {
			hydrationMessages.push(text);
		}
	});
	page.on("pageerror", (error) => {
		const message = error.message;
		if (
			message.includes("Hydration failed") ||
			message.includes("getServerSnapshot should be cached")
		) {
			hydrationMessages.push(message);
		}
	});

	await page.goto(url("/router-state/package"));
	await expect(page.getByTestId("package-router-pathname")).toHaveText(
		"/router-state/package",
	);
	expect(hydrationMessages).toEqual([]);
});
