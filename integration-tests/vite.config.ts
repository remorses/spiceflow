import { defineConfig } from "vite";
import { spiceflowPlugin } from "spiceflow/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import inspect from "vite-plugin-inspect";

const isVercel = process.env.VERCEL === "1";

// Activate the "vercel" condition so #counter-store resolves to the
// Upstash Redis implementation instead of the globalThis default.
// Must be set per-environment because the RSC environment overrides resolve.conditions.
const extraConditions = isVercel ? ["vercel"] : [];

export default defineConfig({
	clearScreen: false,
	resolve: {
		conditions: extraConditions,
	},
	environments: {
		rsc: {
			resolve: {
				conditions: extraConditions,
			},
		},
	},
	plugins: [
		// inspect(),
		tailwindcss(),
		react(),
		spiceflowPlugin({
			entry: "./src/main.tsx",
		}),
	],
});
