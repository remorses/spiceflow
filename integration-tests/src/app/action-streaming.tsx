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
