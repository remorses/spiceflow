"use client";

import { useLoaderData } from "spiceflow/react";
import { Link } from "spiceflow/react";

export function LoaderDataDisplay() {
	const data = useLoaderData();
	return (
		<div data-testid="loader-data-client">
			{JSON.stringify(data)}
		</div>
	);
}

export function LoaderNavLinks() {
	return (
		<div>
			<Link href="/loader-test" data-testid="link-loader-test">
				Loader Test
			</Link>
			<Link href="/loader-test/nested" data-testid="link-loader-nested">
				Loader Nested
			</Link>
			<Link href="/loader-test/other" data-testid="link-loader-other">
				Loader Other
			</Link>
		</div>
	);
}
