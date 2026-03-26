"use client";
// Client component for testing .server.ts file guard.
// Does NOT import any .server files — used as the "works normally" baseline test.
export function ServerGuardTestClient() {
	return <div data-testid="server-guard-test">server guard ok</div>;
}
