// Client component that tests reading request body inside a server action.
"use client";

import { useState } from "react";
import { readBodyAction } from "./action-slow";

export function ActionBodyTest() {
	const [result, setResult] = useState<string>("idle");

	async function handleClick() {
		setResult("loading");
		try {
			const res = await readBodyAction();
			setResult(res.error ?? "ok");
		} catch (e) {
			setResult(`error: ${e}`);
		}
	}

	return (
		<div data-testid="action-body-test">
			<button onClick={handleClick}>Read Body</button>
			<span data-testid="action-body-result">{result}</span>
		</div>
	);
}
