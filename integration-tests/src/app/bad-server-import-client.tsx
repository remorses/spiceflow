"use client";
import { secret } from "./secret.server";
// Client component that statically imports a .server module.
// This should trigger a resolveId error in the client environment.
export function BadServerImportClient() {
	return <div data-testid="bad-server-import">{secret}</div>;
}
