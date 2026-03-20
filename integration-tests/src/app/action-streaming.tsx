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
