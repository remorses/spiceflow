import { Spiceflow } from "spiceflow";
import { Suspense } from "react";
import { IndexPage } from "./app/index";
import { Layout } from "./app/layout";
import "./styles.css";

import {
	ClientComponentThrows,
	ErrorInUseEffect,
	ErrorRender,
} from "./app/client";
import { ErrorBoundary } from "spiceflow/dist/react/components";
import { redirect, sleep } from "spiceflow/dist/utils";
import { notFound } from "spiceflow/dist/react/errors";
import { DialogDemo } from "./app/dialog";
import { WithSelect } from "./app/select";
import { Chakra } from "./app/chakra";

const app = new Spiceflow()
	.state("middleware1", "")
	.use(async ({ request, state }, next) => {
		console.log("middleware 1");
		state.middleware1 = "state set by middleware1";
		const res = await next();
		res.headers.set("x-middleware-1", "ok");
		console.log("middleware 2");
		return res;
	})
	.layout("/*", async ({ children, state }) => {
		return (
			<Layout>
				<title>title from layout</title>
				{children}
			</Layout>
		);
	})
	.page("/state", async ({ state }) => {
		return (
			<>
				<title>title from page</title>
				state: {state.middleware1}
			</>
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
	.page("/error-in-use-effect", async () => {
		return <ErrorInUseEffect />;
	})
	.page("/rsc-error", async () => {
		return <ServerComponentThrows />;
	})
	.page("/client-error", async () => {
		return <ClientComponentThrows />;
	})
	.page("/dialog", async () => {
		return <DialogDemo />;
	})
	.page("/chakra", async () => {
		return <Chakra />;
	})
	.page("/select", async () => {
		return <WithSelect />;
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
