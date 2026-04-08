// Client component that tests router.getLoaderData() outside React render.
"use client";

import { useState, useCallback } from "react";
import { getRouter } from "spiceflow/react";
import { Link } from "spiceflow/react";

const router = getRouter();

// Expose for e2e testing via page.evaluate
if (typeof window !== "undefined") {
	(window as any).__test_getLoaderData = () => router.getLoaderData();
}

export function GlobalLoaderDisplay() {
	if (typeof window !== "undefined") {
		(window as any).__test_getLoaderData = () => router.getLoaderData();
	}

	return (
		<div>
			<Link href="/loader-test/nested" data-testid="link-global-nested">
				Go Nested
			</Link>
			<Link href="/loader-test/other" data-testid="link-global-other">
				Go Other
			</Link>
		</div>
	);
}

export function SubscribeDataReader() {
	const [data, setData] = useState<string>("");
	const refresh = useCallback(async () => {
		setData("loading");
		try {
			const d = await router.getLoaderData();
			setData(JSON.stringify(d));
		} catch (error) {
			setData(error instanceof Error ? error.message : String(error));
		}
	}, []);
	return (
		<div>
			<div data-testid="subscribe-data-live">{data}</div>
			<button data-testid="read-loader-data" onClick={refresh}>
				Read
			</button>
		</div>
	);
}
