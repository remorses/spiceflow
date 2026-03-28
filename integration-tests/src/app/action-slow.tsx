"use server";

import { getActionRequest } from "spiceflow";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function slowAction(): Promise<string> {
	await sleep(100_000);
	return "completed";
}

// Server action that detects abort via getActionRequest().signal and
// resolves early instead of blocking for 100 seconds.
// Returns request metadata from getActionRequest() to prove the API works.
export async function inspectRequestAction(): Promise<{
	url: string;
	method: string;
	hasSignal: boolean;
}> {
	const request = getActionRequest();
	return {
		url: request.url,
		method: request.method,
		hasSignal: request.signal instanceof AbortSignal,
	};
}
