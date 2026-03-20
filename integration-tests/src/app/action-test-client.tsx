// Client components for testing server actions: streaming and direct calls.
"use client";

import React, { useState, useTransition } from "react";
import { streamingAction, simpleAction } from "./action-streaming";

export function StreamingActionTest() {
	const [items, setItems] = useState<string[]>([]);
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function handleClick() {
		setItems([]);
		setDone(false);
		setError(null);
		try {
			const generator = await streamingAction();
			for await (const chunk of generator) {
				setItems((prev) => [...prev, chunk]);
			}
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div data-testid="streaming-action-test">
			<button data-testid="start-streaming" onClick={() => startTransition(handleClick)}>
				Start Streaming
			</button>
			{items.map((item, i) => (
				<div key={i} data-testid="action-stream-item">
					{item}
				</div>
			))}
			{done && <div data-testid="action-stream-done">done</div>}
			{error && <div data-testid="action-stream-error">{error}</div>}
			{isPending && <div data-testid="action-pending">pending</div>}
		</div>
	);
}

export function SimpleActionTest() {
	const [result, setResult] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleClick() {
		try {
			const res = await simpleAction("hello");
			setResult(res);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div data-testid="simple-action-test">
			<button data-testid="call-simple-action" onClick={handleClick}>
				Call Action
			</button>
			{result && <div data-testid="simple-action-result">{result}</div>}
			{error && <div data-testid="simple-action-error">{error}</div>}
		</div>
	);
}


