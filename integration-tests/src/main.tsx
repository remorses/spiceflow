import { Suspense, useActionState, useState } from "react";

import { Spiceflow, serveStatic, redirect } from "spiceflow";
import { IndexPage } from "./app/index";
import { getCounter } from "./app/action";
import { Layout } from "./app/layout";
import { StaticPage } from "./app/static-page";
import "./styles.css";

import { ErrorBoundary } from "spiceflow/dist/react/components";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
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
import {
	StreamingActionTest,
	SimpleActionTest,
	RedirectActionTest,
} from "./app/action-test-client";

let inlineActionRenderCount = 0;
import { Head, Link } from "spiceflow/react";
import { CssTestClient } from "./app/client";
import { CssTestServer } from "./app/css-test-server";
import { ScrollTestPage } from "./app/scroll-test";
import {
	LayoutClientContextProvider,
	LayoutClientContextValue,
} from "./app/client-context";
import { LoaderDataDisplay, LoaderNavLinks } from "./app/loader-test-client";
import {
	GlobalLoaderDisplay,
	SubscribeDataReader,
} from "./app/loader-global-client";
import { ServerGuardTestClient } from "./app/server-guard-test-client";
import { ActionFormTest } from "./app/action-form-test";

// Increments on every RSC render of the home page. Used by e2e tests to detect
// unwanted server re-renders (e.g. client HMR should not trigger a server render).
let serverRenderCount = 0;

// In-memory page cache for e2e testing of the README caching middleware pattern.
// Key = pathname+search (naturally separates HTML and RSC responses).
const pageCache = new Map<
	string,
	{ body: string; status: number; headers: [string, string][] }
>();
let cachedPageRenderCount = 0;

function notFound() {
	return new Response(null, { status: 404 });
}

export const app = new Spiceflow()
	.use(serveStatic({ root: "./public" }))
	.state("middleware1", "")
	.use(async ({ request, state }, next) => {
		state.middleware1 = "state set by middleware1";
		const res = await next();
		res.headers.set("x-middleware-1", "ok");
		res.headers.set(
			"x-middleware-response-type",
			res.headers.get("content-type") || "",
		);

		return res;
	})
	.layout("/*", async ({ children, state }) => {
		return (
			<Layout>
				<Head>
					<Head.Title>title from layout</Head.Title>
				</Head>
				{children}
			</Layout>
		);
	})
	.page("/state", async ({ state }) => {
		return (
			<>
				<Head>
					<Head.Title>title from page</Head.Title>
				</Head>
				state: {state.middleware1}
			</>
		);
	})
	.page("/", async ({ request }) => {
		serverRenderCount++;
		const counter = await getCounter();
		const serverRandom = Math.random().toString(36).slice(2);
		return (
			<>
				<Head>
					<Head.Title>title from page</Head.Title>
				</Head>
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
		await sleep(10);
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
	.page("/slow-notfound", async () => {
		await sleep(100);
		throw notFound();
	})

	.page("/redirect-in-rsc-suspense", async () => {
		return (
			<Suspense fallback={<div>redirecting...</div>}>
				<Redirects />
			</Suspense>
		);
	})
	.layout("/response-headers/*", async ({ children, response }) => {
		response.headers.set("x-layout-header", "layout");
		return <>{children}</>;
	})
	.page("/response-headers", async ({ response }) => {
		response.headers.set("cache-control", "private, max-age=60");
		response.headers.set("x-page-header", "page");
		response.headers.append("set-cookie", "page-cookie=1; Path=/; HttpOnly");
		return <div data-testid="response-headers-page">response headers page</div>;
	})
	.page("/response-headers/redirect", async ({ response }) => {
		response.headers.append(
			"set-cookie",
			"before-redirect=1; Path=/; HttpOnly",
		);
		throw redirect("/response-target");
	})
	.page("/response-target", async () => {
		return <div data-testid="response-target-page">response target</div>;
	})
	.page("/response-nav", async () => {
		return (
			<div>
				<Link href="/response-headers" data-testid="response-nav-link">
					Go to response headers page
				</Link>
			</div>
		);
	})
	.layout("/layout-client-context/*", async ({ children }) => {
		return (
			<LayoutClientContextProvider value="from-layout-client-provider">
				{children}
			</LayoutClientContextProvider>
		);
	})
	.page("/layout-client-context", async () => {
		return <LayoutClientContextValue />;
	})
	.page("/layout-client-context-nav", async () => {
		return (
			<div>
				<Link
					href="/layout-client-context"
					data-testid="layout-client-context-nav-link"
				>
					Go to layout client context page
				</Link>
			</div>
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
		await sleep(100);
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
		await sleep(100);
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

			return;
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
	.page("/usestate-in-rsc", async () => {
		return <UseStateInServerComponent />;
	})
	.page("/streaming", async () => {
		async function* generateMessages() {
			yield "message-1";
			await sleep(50);
			yield "message-2";
			await sleep(50);
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
				<div
					data-testid="css-test-tailwind"
					className="text-green-600 border-2 border-green-600 p-2"
				>
					Tailwind styled element
				</div>
			</div>
		);
	})
	.use(async ({ request }, next) => {
		const url = new URL(request.url);
		if (!url.pathname.startsWith("/cached-page")) {
			return next();
		}
		if (request.method !== "GET") {
			return next();
		}
		const cacheKey = `${url.pathname}${url.search}`;
		const cached = pageCache.get(cacheKey);
		if (cached) {
			const headers = new Headers(cached.headers);
			headers.set("x-cache", "HIT");
			return new Response(cached.body, { status: cached.status, headers });
		}
		const response = await next();
		if (!response || response.status !== 200) {
			return response;
		}
		const body = await response.text();
		const headers = new Headers(response.headers);
		headers.set("x-cache", "MISS");
		pageCache.set(cacheKey, {
			body,
			status: response.status,
			headers: [...headers.entries()],
		});
		return new Response(body, { status: response.status, headers });
	})
	.page("/cached-page", async () => {
		cachedPageRenderCount++;
		const timestamp = Date.now();
		const random = Math.random().toString(36).slice(2);
		return (
			<div data-testid="cached-page">
				<h1>Cached Page</h1>
				<span data-testid="cached-render-count">{cachedPageRenderCount}</span>
				<span data-testid="cached-timestamp">{timestamp}</span>
				<span data-testid="cached-random">{random}</span>
				<Link href="/" data-testid="cached-page-home-link">
					Back to Home
				</Link>
			</div>
		);
	})
	.page("/cached-page-nav", async () => {
		return (
			<div>
				<Link href="/cached-page" data-testid="link-to-cached-page">
					Go to cached page
				</Link>
			</div>
		);
	})
	.get("/api/cache-clear", () => {
		pageCache.clear();
		cachedPageRenderCount = 0;
		return { cleared: true };
	})
	.page("/static/:id", function StaticComponent({ params: { id } }) {
		return <StaticPage id={id} />;
	})
	.page("/prerender-nav", async () => {
		return (
			<div>
				<Link href="/static/one" data-testid="link-static-one">
					Go to static one
				</Link>
				<Link href="/static/two" data-testid="link-static-two">
					Go to static two
				</Link>
			</div>
		);
	})
	.page("/meta", async ({ request }) => {
		return (
			<div className="">
				<Head>
					<Head.Title>Spiceflow Example</Head.Title>
					<Head.Meta name="test" content="value" />
					<Head.Meta name="test" content="value" />
					<Head.Meta property="og:title" content="Spiceflow Example" />
					<Head.Meta
						property="og:description"
						content="An example application built with Spiceflow"
					/>
					<Head.Meta property="og:type" content="website" />
					<Head.Meta property="og:image" content="/og-image.jpg" />
					<Head.Meta property="og:url" content="https://example.com" />
				</Head>
			</div>
		);
	})
	.layout("/meta-override/*", async ({ children }) => {
		return (
			<>
				<Head>
					<Head.Title>Layout title</Head.Title>
					<Head.Meta name="description" content="Layout description" />
					<Head.Meta property="og:title" content="Layout og:title" />
				</Head>
				{children}
			</>
		);
	})
	.page("/meta-override", async () => {
		return (
			<div>
				<Head>
					<Head.Title>Page title</Head.Title>
					<Head.Meta name="description" content="Page description" />
					<Head.Meta property="og:title" content="Page og:title" />
				</Head>
			</div>
		);
	})

	.page("/server-guard-test", async () => {
		return <ServerGuardTestClient />;
	})
	.page("/page-returns-error", async () => {
		return new Error("page handler returned an error");
	})
	.get("/api/returns-error", () => {
		return new Error("api handler returned an error");
	})
	.get("/api/returns-error-with-status", () => {
		return Object.assign(new Error("bad request"), { status: 400 });
	})
	.post("/echo", async ({ request }) => {
		const body = await request.json();
		return { echo: body };
	})
	.get("/api/hello", () => "Hello from API!")
	.get("/api/response-headers", ({ response }) => {
		response.headers.set("x-api-header", "ok");
		response.headers.append("set-cookie", "api-cookie=1; Path=/; HttpOnly");
		return { ok: true };
	})
	.post("/api/echo", async ({ request }) => {
		const body = await request.json();
		return { echo: body };
	})
	.page("/server-action-streaming", async () => {
		return <StreamingActionTest />;
	})
	.page("/server-action-simple", async () => {
		return <SimpleActionTest />;
	})
	.page("/server-action-redirect", async () => {
		return <RedirectActionTest />;
	})
	.page("/inline-action-with-closure", async () => {
		let renderCount = inlineActionRenderCount++;
		const closedValue = "just-a-string";
		async function myAction(formData: FormData) {
			"use server";
			const name = formData.get("name");
			return `hello ${name}, state=${closedValue}`;
		}
		return (
			<form action={myAction} data-testid="inline-action-form">
				<input name="name" type="text" defaultValue="world" />
				<button type="submit">Submit</button>
				<div data-testid="inline-action-render-count">{renderCount}</div>
			</form>
		);
	})
	.page("/form-action-test", async () => {
		async function handleSubmit(prev: string, formData: FormData) {
			"use server";
			const message = formData.get("message") as string;
			return `Received: ${message}`;
		}
		return <ActionFormTest action={handleSubmit} />;
	})
	.page("/form-action-error-test", async () => {
		async function handleSubmit(prev: string, formData: FormData) {
			"use server";
			throw new Error("Action failed: invalid input");
		}
		return <ActionFormTest action={handleSubmit} />;
	})
	// --- Loader tests ---
	.loader("/loader-test/*", async () => {
		return { global: "from-wildcard-loader" };
	})
	.loader("/loader-test/nested", async () => {
		return { nested: "from-nested-loader" };
	})
	.page("/loader-test", async ({ loaderData }) => {
		return (
			<div>
				<div data-testid="loader-data-server">{JSON.stringify(loaderData)}</div>
				<LoaderDataDisplay />
				<LoaderNavLinks />
			</div>
		);
	})
	.page("/loader-test/nested", async ({ loaderData }) => {
		return (
			<div>
				<div data-testid="loader-data-server">{JSON.stringify(loaderData)}</div>
				<LoaderDataDisplay />
				<LoaderNavLinks />
			</div>
		);
	})
	.page("/loader-test/other", async ({ loaderData }) => {
		return (
			<div>
				<div data-testid="loader-data-server">{JSON.stringify(loaderData)}</div>
				<LoaderDataDisplay />
				<LoaderNavLinks />
			</div>
		);
	})
	.page("/loader-nav-start", async () => {
		return (
			<div>
				<LoaderNavLinks />
			</div>
		);
	})
	// --- getLoaderData (module scope) tests ---
	.page("/loader-test/global", async ({ loaderData }) => {
		return (
			<div>
				<div data-testid="loader-data-server">{JSON.stringify(loaderData)}</div>
				<GlobalLoaderDisplay />
				<SubscribeDataReader />
			</div>
		);
	})
	// --- Loader redirect/notFound tests ---
	.loader("/loader-redirect", async () => {
		throw redirect("/other");
	})
	.page("/loader-redirect", async () => {
		return <div>should not render</div>;
	})
	.loader("/loader-redirect-return", async () => {
		return redirect("/other");
	})
	.page("/loader-redirect-return", async () => {
		return <div>should not render</div>;
	})
	.loader("/loader-notfound", async () => {
		throw notFound();
	})
	.page("/loader-notfound", async () => {
		return <div>should not render</div>;
	})
	.loader("/loader-notfound-return", async () => {
		return notFound();
	})
	.page("/loader-notfound-return", async () => {
		return <div>should not render</div>;
	})
	.loader("/loader-error", async () => {
		throw new Error("loader-boom");
	})
	.page("/loader-error", async () => {
		return <div>should not render</div>;
	});

const somePaths = ["/static/one", "/static/two"];
for (const path of somePaths) {
	app.staticPage(path);
}

async function Redirects() {
	await sleep(10);
	throw redirect("/");
	return <div>Redirect</div>;
}

async function ServerComponentThrows() {
	throw new Error("Server component error");
	return <div>Server component</div>;
}

// Server component that accidentally uses useState (a client-only API).
// useState is undefined in the react-server build, so calling it throws a TypeError.
// The formatServerError utility should rewrite this into an actionable message.
function UseStateInServerComponent() {
	const [count] = useState(0);
	return <div>count: {count}</div>;
}

app
	.get("/api/sharp-test", async () => {
		const sharp = (await import("sharp")).default;
		const metadata = await sharp({
			create: {
				width: 10,
				height: 10,
				channels: 3,
				background: { r: 255, g: 0, b: 0 },
			},
		})
			.png()
			.metadata();
		return { format: metadata.format, width: metadata.width };
	})
	.get("/api/lodash-test", async () => {
		const _ = (await import("lodash")).default;
		return { result: _.chunk([1, 2, 3, 4, 5, 6], 2) };
	})
	.listen(Number(process.env.PORT || 3000));
