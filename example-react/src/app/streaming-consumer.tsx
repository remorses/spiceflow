// Client component that consumes an async iterable prop, rendering items
// incrementally as they arrive from the server via the RSC flight stream.
"use client";

import { useEffect, useState } from "react";

export function StreamingConsumer({
	stream,
}: {
	stream: AsyncIterable<string>;
}) {
	const [items, setItems] = useState<string[]>([]);
	const [done, setDone] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			for await (const item of stream) {
				if (cancelled) break;
				setItems((prev) => [...prev, item]);
			}
			if (!cancelled) setDone(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [stream]);

	return (
		<div data-testid="streaming-container">
			{items.map((item, i) => (
				<div key={i} data-testid="stream-item">
					{item}
				</div>
			))}
			{done && <div data-testid="stream-done">done</div>}
		</div>
	);
}
