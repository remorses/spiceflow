import { Spiceflow } from "spiceflow";
import { IndexPage } from "./app/index";
import { Layout } from "./app/layout";

const app = new Spiceflow()
	.layout("/*", async ({ children, request }) => {
		return <Layout>{children}</Layout>;
	})
	.page("/", async ({ request }) => {
		const url = new URL(request.url);
		return <IndexPage />;
	})
	.page("/:id", async ({ request, params }) => {
		const url = new URL(request.url);
		return (
			<Layout>
				<IndexPage />
			</Layout>
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

export default app;
