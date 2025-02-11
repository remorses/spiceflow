import { Spiceflow } from "spiceflow";
import { Suspense } from "react";
import { IndexPage } from "./app/index";
import { Layout } from "./app/layout";
import "./styles.css";

import { ClientComponentThrows, ErrorRender } from "./app/client";
import { ErrorBoundary } from "spiceflow/dist/react/components";
import { redirect, sleep } from "spiceflow/dist/utils";
import { notFound } from "spiceflow/dist/react/errors";

const app = new Spiceflow()
	.layout("/*", async ({ children, request }) => {
		return (
			<Layout>
				<title>title from layout</title>
				{children}
			</Layout>
		);
	})
	.page("/", async ({ request }) => {
		const url = new URL(request.url);
		return (
			<>
				<title>title from page</title>
				<IndexPage />
			</>
		);
	})

	.get("/hello", () => "Hello, World!")
	.page("/not-found", () => {
		throw notFound();
	})
	.layout("/not-found-in-suspense", async ({ children }) => {
		return <Suspense fallback={<div>not found...</div>}>{children}</Suspense>;
	})
	.page("/not-found-in-suspense", async () => {
		await sleep(100);
		throw notFound();
	})
	.page("/top-level-redirect", async () => {
		throw redirect("/");
	})
	.page("/redirect-in-rsc", async () => {
		return <Redirects />;
	})
	.page("/slow-redirect", async ({ request, children }) => {
		await sleep(100);

		throw redirect("/");
	})

	.page("/redirect-in-rsc-suspense", async () => {
		return (
			<Suspense fallback={<div>redirecting...</div>}>
				<Redirects />
			</Suspense>
		);
	})
	.layout("/page/*", async ({ request, children }) => {
		return (
			<div className="">
				<h1>/page layout 1</h1>
				{children}
			</div>
		);
	})
	.page("/slow", async ({ request, children }) => {
		await sleep(1000);
		return (
			<div className="">
				<h1>this is a slow page</h1>
			</div>
		);
	})
	.layout("/slow-suspense", async ({ request, children }) => {
		return (
			<div className="">
				<h1>/slow-suspense layout</h1>
				<Suspense fallback={<div>Loading slow page layout...</div>}>
					{children}
				</Suspense>
			</div>
		);
	})
	.page("/slow-suspense", async ({ request, children }) => {
		await sleep(1000);
		return (
			<div className="">
				<h1>slow page</h1>
			</div>
		);
	})
	.layout("/page/*", async ({ request, children }) => {
		return (
			<div className="">
				<h1>/page layout 2</h1>
				{children}
			</div>
		);
	})
	.page("/page", async ({ request }) => {
		const url = new URL(request.url);
		return (
			<div>
				<a href="/page/1">/page/1</a>
				<IndexPage />
			</div>
		);
	})
	.page("/page/1", async ({ request }) => {
		const url = new URL(request.url);
		return (
			<div>
				<a href="/page">/page</a>
				<IndexPage />
			</div>
		);
	})
	.page("/:id", async ({ request, params }) => {
		const url = new URL(request.url);
		return (
			<div className="">
				<h1>:id page</h1>
				<IndexPage />
			</div>
		);
	})
	.layout("/error-boundary", async ({ children }) => {
		return (
			<ErrorBoundary errorComponent={ErrorRender}>{children}</ErrorBoundary>
		);
	})
	.page("/error-boundary", async () => {
		throw new Error("test error");
	})
	.page("/rsc-error", async () => {
		return <ServerComponentThrows />;
	})
	.page("/client-error", async () => {
		return <ClientComponentThrows />;
	})

	.post("/echo", async ({ request }) => {
		const body = await request.json();
		return { echo: body };
	});

async function Redirects() {
	await sleep(100);
	throw redirect("/");
	return <div>Redirect</div>;
}

async function ServerComponentThrows() {
	throw new Error("Server component error");
	return <div>Server component</div>;
}

export default app;
