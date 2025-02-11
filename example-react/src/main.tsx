import { Spiceflow } from "spiceflow";
import { Suspense } from "react";
import { IndexPage } from "./app/index";
import { Layout } from "./app/layout";
import "./styles.css";
import { ClientComponentThrows } from "./app/client";
import { ErrorBoundary } from "spiceflow/dist/react/components";
import { sleep } from "spiceflow/dist/utils";

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
	.page("/redirect", async () => {
		throw new Response("Redirect", {
			status: 302,
			headers: {
				location: "/",
			},
		});
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
	.page("/loader-error", async () => {
		throw new Error("test error");
	})
	.page("/rsc-error", async () => {
		return <ServerComponentThrows />;
	})
	.page("/client-error", async () => {
		return <ClientComponentThrows />;
	})
	.page("/redirect-in-rsc", async () => {
		return <Redirects />;
	})
	.post("/echo", async ({ request }) => {
		const body = await request.json();
		return { echo: body };
	});

async function Redirects() {
	throw new Response("Redirect", {
		status: 302,
		headers: {
			location: "/",
		},
	});
	return <div>Redirect</div>;
}

async function ServerComponentThrows() {
	throw new Error("Server component error");
	return <div>Server component</div>;
}

export default app;
