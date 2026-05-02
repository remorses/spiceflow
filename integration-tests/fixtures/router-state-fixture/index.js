/** Built package client component fixture for Spiceflow integration tests. */
"use client";

import { jsx } from "react/jsx-runtime";
import { useRouterState } from "spiceflow/react";

export function PackageRouterPathnameProbe() {
	const { pathname } = useRouterState();

	return jsx("div", { "data-testid": "package-router-pathname", children: pathname });
}
