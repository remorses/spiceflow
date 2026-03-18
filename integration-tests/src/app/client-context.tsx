// This file provides a client-side React context provider and consumer for e2e tests.
"use client";

import React from "react";

const LayoutClientContext = React.createContext("missing-client-context");

export function LayoutClientContextProvider({
	children,
	value,
}: {
	children: React.ReactNode;
	value: string;
}) {
	return (
		<LayoutClientContext.Provider value={value}>
			{children}
		</LayoutClientContext.Provider>
	);
}

export function LayoutClientContextValue() {
	const value = React.useContext(LayoutClientContext);

	return <div data-testid="layout-client-context-value">{value}</div>;
}
