"use client";

import { useActionState } from "react";
import { getActionAbortController } from "spiceflow/react";
import { slowAction, inspectRequestAction } from "./action-slow";

export function AbortActionTest() {
	const [state, formAction, isPending] = useActionState(
		async (prev: string, _formData: FormData) => {
			try {
				return await slowAction();
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") {
					return "aborted";
				}
				const msg =
					err instanceof Error ? `${err.name}:${err.message}` : String(err);
				return `error: ${msg}`;
			}
		},
		"idle",
	);

	return (
		<div data-testid="abort-action-test">
			<form action={formAction}>
				<button type="submit" data-testid="start-slow-action">
					Start
				</button>
			</form>
			<button
				data-testid="abort-slow-action"
				onClick={() => getActionAbortController(slowAction)?.abort()}
			>
				Abort
			</button>
			<div data-testid="action-state">{state}</div>
			<div data-testid="action-pending">{String(isPending)}</div>
		</div>
	);
}

export function InspectRequestActionTest() {
	const [state, formAction, isPending] = useActionState(
		async (prev: string, _formData: FormData) => {
			try {
				const result = await inspectRequestAction();
				return JSON.stringify(result);
			} catch (err) {
				const msg =
					err instanceof Error ? `${err.name}:${err.message}` : String(err);
				return `error: ${msg}`;
			}
		},
		"idle",
	);

	return (
		<div data-testid="inspect-request-test">
			<form action={formAction}>
				<button type="submit" data-testid="call-inspect-request">
					Inspect
				</button>
			</form>
			<div data-testid="inspect-request-state">{state}</div>
			<div data-testid="inspect-request-pending">{String(isPending)}</div>
		</div>
	);
}
