// Server actions for e2e tests: streaming, simple call, and redirect.
"use server";

import { redirect } from "spiceflow";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* streamingAction(): AsyncGenerator<string> {
	yield "chunk-1";
	await sleep(50);
	yield "chunk-2";
	await sleep(50);
	yield "chunk-3";
}

export async function simpleAction(message: string): Promise<string> {
	return `echo: ${message}`;
}

export async function redirectAction(): Promise<never> {
	throw redirect("/other");
}

export async function redirectWithCookieAction(): Promise<never> {
	throw redirect("/other", {
		headers: { "set-cookie": "action-redirect=1; Path=/" },
	});
}

export async function jsxAction(name: string) {
	return (
		<div data-testid="server-jsx-result">
			<h1>Hello {name}</h1>
			<p>Rendered on the server</p>
		</div>
	);
}

export async function* throwingStreamingAction(): AsyncGenerator<string> {
	yield "before-error";
	await sleep(50);
	throw new Error("generator exploded");
}

export async function* jsxStreamingAction(): AsyncGenerator<
	React.ReactElement
> {
	yield <div data-testid="jsx-stream-chunk">chunk-jsx-1</div>;
	await sleep(50);
	yield (
		<div data-testid="jsx-stream-chunk">
			chunk-jsx-2 <strong>bold</strong>
		</div>
	);
	await sleep(50);
	yield <div data-testid="jsx-stream-chunk">chunk-jsx-3</div>;
}
