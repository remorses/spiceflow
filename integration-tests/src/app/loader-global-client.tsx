// Client component that tests router.getLoaderData() outside React render.
"use client";

import { useState, useCallback } from "react";
import { router, Link } from "spiceflow/react";

export function GlobalLoaderDisplay() {
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
