import { Suspense, useActionState } from "react";

import { Spiceflow, serveStatic } from "spiceflow";
import { IndexPage } from "./app/index";
import { getCounter } from "./app/action";
import { Layout } from "./app/layout";
import "./styles.css";

import { ErrorBoundary } from "spiceflow/dist/react/components";
import { notFound } from "spiceflow/dist/react/errors";
import { redirect, sleep } from "spiceflow/dist/utils";
import { Chakra } from "./app/chakra";
import {
	ClientComponentThrows,
	ClientFormWithError,
	ErrorInUseEffect,
	ErrorRender,
} from "./app/client";
import { DialogDemo } from "./app/dialog";
import { WithSelect } from "./app/select";
import { ThrowsDuringSSR } from "./app/ssr-error";
import { StreamingConsumer } from "./app/streaming-consumer";
import { Head } from "spiceflow/react";
import { CssTestClient } from "./app/client";
import { CssTestServer } from "./app/css-test-server";
import { ScrollTestPage } from "./app/scroll-test";

// Increments on every RSC render of the home page. Used by e2e tests to detect
// unwanted server re-renders (e.g. client HMR should not trigger a server render).
let serverRenderCount = 0;

export const app = new Spiceflow()
	.use(serveStatic({ root: "./public" }))
	.use(serveStatic({ root: "./dist/client" })) // required to serve vite built static files
	.state("middleware1", "")
	.use(async ({ request, state }, next) => {
		state.middleware1 = "state set by middleware1";
		const res = await next();
		res.headers.set("x-middleware-1", "ok");

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
		const middlewareState = state as { middleware1: string };
		return (
			<>
				<title>title from page</title>
				state: {middlewareState.middleware1}
			</>
		);
	})
	.page("/", async ({ request }) => {
		serverRenderCount++;
		const counter = await getCounter();
		const serverRandom = Math.random().toString(36).slice(2);
		return (
			<>
				<title>title from page</title>
				<span data-testid="server-render-count">{serverRenderCount}</span>
				<IndexPage counter={counter} serverRandom={serverRandom} />
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
	// throw redirect/notFound from layout (not page) — tests that the framework
	// preserves the correct status code even when the throw happens in a layout
	.layout("/throw-redirect-in-layout/*", async ({ children }) => {
		throw redirect("/other");
	})
	.page("/throw-redirect-in-layout", async () => {
		return <div>should not render</div>;
	})
	.page("/throw-redirect-in-layout/nested", async () => {
		return <div>should not render</div>;
	})
	.layout("/throw-notfound-in-layout/*", async ({ children }) => {
		throw notFound();
	})
	.page("/throw-notfound-in-layout", async () => {
		return <div>should not render</div>;
	})
	.page("/throw-notfound-in-layout/nested", async () => {
		return <div>should not render</div>;
	})
	// dedicated pages for client-side navigation tests — separate from the existing
	// routes so the tests stay isolated and don't interfere with other suites
	.page("/throw-redirect-in-page", async () => {
		throw redirect("/other");
	})
	.page("/throw-notfound-in-page", async () => {
		throw notFound();
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
	.page("/form-server", async ({ state, children }) => {
		async function action(data: FormData) {
			"use server";
			if (!state) {
				throw new Error("userId not set");
			}

			return
		}

		return (
			<form action={action} className="">
				<input name="name" className="border" type="text" />
				<button type="submit">Submit</button>
			</form>
		);
	})
	.page("/form-error", async ({ request, children }) => {
		return <ClientFormWithError shouldError />;
	})
	.page("/form", async ({ request, children }) => {
		return <ClientFormWithError />;
	})
	.page("/form-redirect", async ({ request, children }) => {
		return <ClientFormWithError shouldRedirect />;
	})
	.page("/form-inline-action-server", async ({ state, children }) => {
		async function action(formState) {
			"use server";
			console.log({ state });
			return {
				...formState,
				result: JSON.stringify({ state, hello: true }),
			};
		}
		return <ClientFormWithError action={action} shouldRedirect />;
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
		const counter = await getCounter();
		const serverRandom = Math.random().toString(36).slice(2);
		return (
			<div>
				<a href="/page/1">/page/1</a>
				<IndexPage counter={counter} serverRandom={serverRandom} />
			</div>
		);
	})
	.page("/page/1", async ({ request }) => {
		const counter = await getCounter();
		const serverRandom = Math.random().toString(36).slice(2);
		return (
			<div>
				<a href="/page">/page</a>
				<IndexPage counter={counter} serverRandom={serverRandom} />
			</div>
		);
	})
	.page("/:id", async ({ request, params }) => {
		const counter = await getCounter();
		const serverRandom = Math.random().toString(36).slice(2);
		return (
			<div className="">
				<h1>:id page</h1>
				<IndexPage counter={counter} serverRandom={serverRandom} />
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
	.page("/streaming", async () => {
		async function* generateMessages() {
			yield "message-1";
			await sleep(1500);
			yield "message-2";
			await sleep(1500);
			yield "message-3";
		}
		return <StreamingConsumer stream={generateMessages()} />;
	})
	.page("/ssr-error-fallback", async () => {
		return <ThrowsDuringSSR />;
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
	.page("/scroll-restoration/page-a", async () => {
		return <ScrollTestPage name="Page A" />;
	})
	.page("/scroll-restoration/page-b", async () => {
		return <ScrollTestPage name="Page B" />;
	})
	.page("/css-test", async () => {
		return (
			<div data-testid="css-test-page">
				<h1>CSS Test Page</h1>
				<CssTestServer />
				<CssTestClient />
				<div data-testid="css-test-tailwind" className="text-green-600 border-2 border-green-600 p-2">
					Tailwind styled element
				</div>
			</div>
		);
	})
	.page(
		"/static/:id",
		function StaticComponent({ params: { id } }) {
			return <div className="">This is a static page with id {id}</div>;
		},
	)
	.page("/meta", async ({ request }) => {
		return (
			<div className="">
				<Head>
					<meta name="test" content="value" />
					<meta name="test" content="value" />
					<meta property="og:title" content="Spiceflow Example" />
					<meta
						property="og:description"
						content="An example application built with Spiceflow"
					/>
					<meta property="og:type" content="website" />
					<meta property="og:image" content="/og-image.jpg" />
					<meta property="og:url" content="https://example.com" />
				</Head>
			</div>
		);
	})

	.post("/echo", async ({ request }) => {
		const body = await request.json();
		return { echo: body };
	});

const somePaths = ["/static/one", "/static/two"];
for (const path of somePaths) {
	app.staticPage(path);
}

async function Redirects() {
	await sleep(100);
	throw redirect("/");
	return <div>Redirect</div>;
}

async function ServerComponentThrows() {
	throw new Error("Server component error");
	return <div>Server component</div>;
}

app.listen(3000)
