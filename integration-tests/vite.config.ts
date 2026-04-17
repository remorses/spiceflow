import { defineConfig } from "vite";
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
		tailwindcss(),
		react(),
		spiceflow({
			entry: "./src/main.tsx",
		}),
	],
});
