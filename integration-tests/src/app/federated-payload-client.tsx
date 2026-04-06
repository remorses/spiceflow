"use client";

import React, { Suspense, useState, useTransition } from "react";
import { decodeFederationPayload } from "spiceflow/react";

type ImperativePayload = {
	message: string;
	content: React.ReactNode;
};

function DecodedContent({
	payload,
}: {
	payload: ImperativePayload | null;
}) {
	if (!payload) return null;

	return (
		<div data-testid="decoded-federated-payload">
			<p data-testid="decoded-federated-message">{payload.message}</p>
			<div data-testid="decoded-federated-content">{payload.content}</div>
		</div>
	);
}

export function FederatedPayloadDecodeTest() {
	const [payload, setPayload] = useState<ImperativePayload | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function handleClick() {
		setError(null);
		const response = await fetch("/api/federated-payload", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ label: "Imperative" }),
		});
		const decoded = await decodeFederationPayload<ImperativePayload>(response);
		setPayload(decoded.value);
	}

	return (
		<div data-testid="federated-payload-decode-test">
			<button
				data-testid="decode-federated-payload"
				onClick={() => startTransition(handleClick)}
			>
				Decode federated payload
			</button>
			{isPending && <div data-testid="decode-federated-pending">pending</div>}
			{error && <div data-testid="decode-federated-error">{error}</div>}
			<Suspense fallback={<div data-testid="decode-federated-loading">loading</div>}>
				<DecodedContent payload={payload} />
			</Suspense>
		</div>
	);
}
