/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ command }) => ({
	// Force a single React instance so the React Compiler runtime (useMemoCache)
	// always finds the current dispatcher — a newly pre-bundled dependency must
	// not pull in a second copy of React.
	resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
	optimizeDeps: { include: ["qrcode.react"] },
	plugins: [
		// Dev server only: the devtools have no place in a production bundle.
		...(command === "serve" ? [devtools()] : []),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["url", "baseLocale"],
		}),
		nitro({ rollupConfig: { external: [/^@sentry\//] } }),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	test: {
		// Component tests need a DOM. Without this they'd run in the Node
		// environment and fail as soon as there were any.
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
	},
}));

export default config;
