"use client";
import "./client.css";

import React, { useActionState } from "react";
import { add } from "./action-by-client";
import { action } from "./form-action";

type ClientFormState = {
	shouldRedirect: boolean;
	shouldError: boolean;
	result: string;
};

type ClientFormAction = (
	state: ClientFormState,
	payload: FormData,
) => Promise<ClientFormState> | ClientFormState;

export function Counter({ name = "Client" }) {
	const [count, setCount] = React.useState(0);
	return (
		<div data-testid="client-counter" style={{ padding: "0.5rem" }}>
			<div>
				{name} counter: {count}
			</div>
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
	return <div>Error from rsc</div>;
}
export function LayoutMountTracker() {
	const [mountCount, setMountCount] = React.useState(0);
	React.useEffect(() => {
		setMountCount((c) => c + 1);
	}, []);
	return <div data-testid="layout-mount-count">{mountCount}</div>;
}

export function CssTestClient() {
	return <div data-testid="css-test-client">Client component with CSS</div>;
}

export function RouterRefreshStateTest({
	serverRandom,
	serverRenderCount,
}: {
	serverRandom: string;
	serverRenderCount: number;
}) {
	const [clientCount, setClientCount] = React.useState(0);
	const [mountCount, setMountCount] = React.useState(0);
	const [awaitedResult, setAwaitedResult] = React.useState("");
	const latestServerRenderCount = React.useRef(serverRenderCount);
	const latestServerRandom = React.useRef(serverRandom);

	latestServerRenderCount.current = serverRenderCount;
	latestServerRandom.current = serverRandom;

	React.useEffect(() => {
		setMountCount((count) => count + 1);
	}, []);

	return (
		<div data-testid="router-refresh-state-test">
			<div data-testid="router-refresh-server-render-count">
				{serverRenderCount}
			</div>
			<div data-testid="router-refresh-server-random">{serverRandom}</div>
			<div data-testid="router-refresh-mount-count">{mountCount}</div>
			<div data-testid="router-refresh-client-count">{clientCount}</div>
			<div data-testid="router-refresh-awaited-result">{awaitedResult}</div>
			<button
				data-testid="router-refresh-increment"
				onClick={() => setClientCount((count) => count + 1)}
			>
				Increment
			</button>
			<button
				data-testid="router-refresh-button"
				onClick={async () => {
					setAwaitedResult("pending");
					const { router } = await import("spiceflow/react");
					router.refresh();
				}}
			>
				Refresh
			</button>
		</div>
	);
}

export function GetRedirectNav() {
	return (
		<div data-testid="get-redirect-nav">
			<button
				data-testid="get-redirect-push"
				onClick={async () => {
					const { router } = await import("spiceflow/react");
					router.push("/get-redirect/123");
				}}
			>
				Push to get redirect
			</button>
		</div>
	);
}

export function ClientFormWithError({
	shouldRedirect = false,
	shouldError = false,
	action: customAction,
}: {
	shouldRedirect?: boolean;
	shouldError?: boolean;
	action?: ClientFormAction;
}) {
	const [state, formAction] = useActionState(customAction ?? action, {
		shouldRedirect,
		shouldError,
		result: "",
	});

	return (
		<form action={formAction} className="flex flex-col gap-2">
			<input name="name" className="border" type="text" />
			<button type="submit">Submit</button>
			<pre>{JSON.stringify(state)}</pre>
		</form>
	);
}
