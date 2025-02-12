"use client";
import "./client.css";

import React, { useActionState } from "react";
import { add } from "./action-by-client";

export function Counter() {
	const [count, setCount] = React.useState(0);
	return (
		<div data-testid="client-counter" style={{ padding: "0.5rem" }}>
			<div>Client counter: {count}</div>
			<div>
				<button onClick={() => setCount((c) => c - 1)}>-</button>
				<button onClick={() => setCount((c) => c + 1)}>+</button>
			</div>
		</div>
	);
}

export function ErrorInUseEffect() {
	React.useEffect(() => {
		setTimeout(() => {
			throw new Error("Error in useEffect");
		}, 0);
	}, []);
	return <div>ErrorInUseEffect</div>;
}

export function Hydrated() {
	return <pre>[hydrated: {Number(useHydrated())}]</pre>;
}

function useHydrated() {
	return React.useSyncExternalStore(
		React.useCallback(() => () => {}, []),
		() => true,
		() => false,
	);
}

export function Calculator() {
	const [returnValue, formAction, _isPending] = React.useActionState(add, null);
	const [x, setX] = React.useState("");
	const [y, setY] = React.useState("");

	return (
		<form
			action={formAction}
			style={{ padding: "0.5rem" }}
			data-testid="calculator"
		>
			<div>Calculator</div>
			<div style={{ display: "flex", gap: "0.3rem" }}>
				<input
					name="x"
					style={{ width: "2rem" }}
					value={x}
					onChange={(e) => setX(e.target.value)}
				/>
				+
				<input
					name="y"
					style={{ width: "2rem" }}
					value={y}
					onChange={(e) => setY(e.target.value)}
				/>
				=<span data-testid="calculator-answer">{returnValue ?? "?"}</span>
			</div>
			<button hidden></button>
		</form>
	);
}

export function ClientComponentThrows() {
	throw new Error("Client component error");
	return <div>Client component</div>;
}

export function ErrorRender({ error }) {
	console.log("caught error", error);
	return <div>Error from rsc</div>;
}


export function ClientFormWithError() {
	async function action(_, data: FormData) {
		"use server";
		console.log("action", data);
		throw new Error("test error");
		return "ok";
	}

	const [state, formAction] = useActionState(action, null);

	return (
		<form action={formAction} className="">
			<input name="name" className="border" type="text" />
			<button type="submit">Submit</button>
		</form>
	);
}