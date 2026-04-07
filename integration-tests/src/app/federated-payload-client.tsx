"use client";

import React, { Suspense, useState, useTransition } from "react";
import { decodeFederationPayload } from "spiceflow/react";

declare const __SPICEFLOW_BASE__: string | undefined;

type ImperativePayload = {
	message: string;
	content: React.ReactNode;
};

type StreamPayload = {
	id: string;
	label: string;
};

type StreamEnvelope = {
	stream: AsyncIterable<StreamPayload>;
};

function withBase(path: string) {
	const base =
		typeof __SPICEFLOW_BASE__ !== "undefined" ? __SPICEFLOW_BASE__ : "";
	if (!base || !path.startsWith("/")) return path;
	return `${base}${path}`;
}

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
	const [streamItems, setStreamItems] = useState<StreamPayload[]>([]);
	const [streamDone, setStreamDone] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	async function handleClick() {
		setError(null);
		const response = await fetch(withBase("/api/federated-payload"), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ label: "Imperative" }),
		});
		const decoded = await decodeFederationPayload<ImperativePayload>(response);
		setPayload(decoded);
	}

	async function handleStreamClick() {
		setStreamItems([]);
		setStreamDone(false);
		setStreamError(null);
		const response = await fetch(withBase("/api/federated-payload-stream"), {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ label: "Stream" }),
		});
		try {
			const decoded = await decodeFederationPayload<StreamEnvelope>(response);
			for await (const item of decoded.stream) {
				setStreamItems((prev) => [...prev, item]);
			}
			setStreamDone(true);
		} catch (err) {
			setStreamError(err instanceof Error ? err.message : String(err));
		}
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
			<button
				data-testid="decode-federated-stream"
				onClick={() => {
					void handleStreamClick();
				}}
			>
				Decode federated stream
			</button>
			{streamError && (
				<div data-testid="decode-federated-stream-error">{streamError}</div>
			)}
			<ul data-testid="decoded-federated-stream">
				{streamItems.map((item) => (
					<li key={item.id} data-testid="decoded-federated-stream-item">
						{item.label}
					</li>
				))}
			</ul>
			{streamDone && (
				<div data-testid="decoded-federated-stream-done">done</div>
			)}
		</div>
	);
}
