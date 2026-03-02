import { defineConfig } from "vite";
import { spiceflowPlugin } from "spiceflow/dist/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	clearScreen: false,
	plugins: [
		// inspect(),
		spiceflowPlugin({
			entry: "./app/main.tsx",
		}),
		tailwindcss(),
	],
});
