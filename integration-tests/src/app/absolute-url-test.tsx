// Client component for testing absolute URL support in router.push/replace and Link.
"use client";

import { useEffect, useState } from "react";
import { router, Link } from "spiceflow/react";

export function AbsoluteUrlTest() {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return (
		<div>
			{hydrated && <span data-testid="hydrated">hydrated</span>}
			<button
				data-testid="push-same-origin-absolute"
				onClick={() => {
					router.push(window.location.origin + "/page");
				}}
			>
				Push same-origin absolute
			</button>
			<button
				data-testid="replace-same-origin-absolute"
				onClick={() => {
					router.replace(window.location.origin + "/page");
				}}
			>
				Replace same-origin absolute
			</button>
			<Link href="https://example.com" data-testid="external-link">
				External Link
			</Link>
			<Link href="/about" data-testid="internal-link">
				Internal Link
			</Link>
		</div>
	);
}
