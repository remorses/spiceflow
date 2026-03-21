// Client component that tests getLoaderData (imperative, non-React access)
// and router.subscribe for LOADER_DATA updates.
"use client";

import { useState, useCallback } from "react";
import { getLoaderData, router } from "spiceflow/react";
import { Link } from "spiceflow/react";

// Expose for e2e testing via page.evaluate
if (typeof window !== "undefined") {
	(window as any).__test_getLoaderData = getLoaderData;
}

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
		const d = await getLoaderData();
		setData(JSON.stringify(d));
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
