// Client components for testing server actions: streaming, direct calls, and redirect.
"use client";

import React, { useState, useTransition } from "react";
import {
	streamingAction,
	simpleAction,
	redirectAction,
	redirectWithCookieAction,
	jsxAction,
	jsxStreamingAction,
	throwingStreamingAction,
} from "./action-streaming";

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
			<button
				data-testid="start-streaming"
				onClick={() => startTransition(handleClick)}
			>
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

export function RedirectActionTest() {
	return (
		<div data-testid="redirect-action-test">
			<button
				data-testid="call-redirect-action"
				onClick={() => redirectAction()}
			>
				Redirect via action
			</button>
			<button
				data-testid="call-redirect-cookie-action"
				onClick={() => redirectWithCookieAction()}
			>
				Redirect with cookie
			</button>
		</div>
	);
}

export function JsxActionTest() {
	const [content, setContent] = useState<React.ReactNode>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleClick() {
		try {
			const jsx = await jsxAction("Tommy");
			setContent(jsx);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div data-testid="jsx-action-test">
			<button data-testid="call-jsx-action" onClick={handleClick}>
				Get JSX
			</button>
			{content && <div data-testid="jsx-action-content">{content}</div>}
			{error && <div data-testid="jsx-action-error">{error}</div>}
		</div>
	);
}

export function JsxStreamingActionTest() {
	const [items, setItems] = useState<React.ReactNode[]>([]);
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function handleClick() {
		setItems([]);
		setDone(false);
		setError(null);
		try {
			const generator = await jsxStreamingAction();
			for await (const chunk of generator) {
				setItems((prev) => [...prev, chunk]);
			}
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div data-testid="jsx-streaming-action-test">
			<button
				data-testid="start-jsx-streaming"
				onClick={() => startTransition(handleClick)}
			>
				Start JSX Streaming
			</button>
			<div data-testid="jsx-stream-items">
				{items.map((item, i) => (
					<div key={i} data-testid="jsx-stream-item">
						{item}
					</div>
				))}
			</div>
			{done && <div data-testid="jsx-stream-done">done</div>}
			{error && <div data-testid="jsx-stream-error">{error}</div>}
			{isPending && <div data-testid="jsx-stream-pending">pending</div>}
		</div>
	);
}

export function ThrowingStreamingActionTest() {
	const [items, setItems] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function handleClick() {
		setItems([]);
		setError(null);
		try {
			const generator = await throwingStreamingAction();
			for await (const chunk of generator) {
				setItems((prev) => [...prev, chunk]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<div data-testid="throwing-streaming-action-test">
			<button
				data-testid="start-throwing-streaming"
				onClick={() => startTransition(handleClick)}
			>
				Start Throwing Streaming
			</button>
			{items.map((item, i) => (
				<div key={i} data-testid="throwing-stream-item">
					{item}
				</div>
			))}
			{error && <div data-testid="throwing-stream-error">{error}</div>}
			{isPending && (
				<div data-testid="throwing-stream-pending">pending</div>
			)}
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
