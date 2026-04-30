import { defineConfig } from "vite";
import type { Plugin } from "vite";
import spiceflow from "spiceflow/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import inspect from "vite-plugin-inspect";

const isVercel = process.env.VERCEL === "1";
const basePath = process.env.BASEPATH || "";

// Activate the "vercel" condition so #counter-store resolves to the
// Upstash Redis implementation instead of the globalThis default.
// Must be set per-environment because the RSC environment overrides resolve.conditions.
const extraConditions = isVercel ? ["vercel"] : [];

function preserveFixturePackageSymlink(): Plugin {
	let resolveWithSymlinkPath:
		| ((id: string, importer?: string, ssr?: boolean) => Promise<string | undefined>)
		| undefined;

	return {
		name: "preserve-router-state-fixture-symlink",
		configResolved(config) {
			const resolver = config.createResolver({ preserveSymlinks: true });
			resolveWithSymlinkPath = (id, importer, ssr) => resolver(id, importer, false, ssr);
		},
		async resolveId(id, importer, options) {
			if (id !== "router-state-fixture") return;

			return resolveWithSymlinkPath?.(id, importer, options.ssr);
		},
	};
}

export default defineConfig({
	clearScreen: false,
	base: basePath || "/",
	resolve: {
		conditions: extraConditions,
		dedupe: ["react", "react-dom", "its-fine", "spiceflow"],
	},
	environments: {
		rsc: {
			resolve: {
				conditions: extraConditions,
				dedupe: ["react", "react-dom", "its-fine", "spiceflow"],
			},
		},
	},
	plugins: [
		// inspect(),
		preserveFixturePackageSymlink(),
		tailwindcss(),
		react(),
		spiceflow({
			entry: "./src/main.tsx",
		}),
	],
});
