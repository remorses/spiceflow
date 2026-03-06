import { defineConfig } from "vite";
import { spiceflowPlugin } from "spiceflow/dist/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import inspect from "vite-plugin-inspect";

export default defineConfig({
	clearScreen: false,
	plugins: [
		// inspect(),
		tailwindcss(),
		react(),
		spiceflowPlugin({
			entry: "./src/main.tsx",
		}),
	],
	// appType: "custom",
	// environments: {
	// 	rsc: {
	// 		resolve: {
	// 			noExternal: ["@chakra-ui/react"],
	// 		},
	// 	},
	// },
});
