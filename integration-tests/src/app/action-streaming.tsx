// Server action that returns an async generator to test streaming support.
"use server";

import { sleep } from "spiceflow/dist/utils";

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

export async function actionWithAbortSignal(
	signal: unknown,
): Promise<string> {
	// AbortSignal is not serializable across the RSC boundary.
	// It arrives as a temporary reference placeholder, not a real AbortSignal.
	const isRealSignal = signal instanceof AbortSignal;
	const type = signal === undefined ? "undefined" : typeof signal === "object" ? signal?.constructor?.name ?? "object" : typeof signal;
	return JSON.stringify({ isRealSignal, type });
}
