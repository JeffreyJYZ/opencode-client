#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { build, type Plugin } from "vite";
import {
	HOST_GLOBAL,
	PLUGIN_ENTRY_DEFAULT,
	PLUGIN_HOST_GLOBAL_SPECIFIERS,
	PLUGIN_OUT_DIR,
	PLUGIN_REFUSED_SPECIFIERS,
	PLUGIN_SOURCE_DIR,
	PLUGIN_SOURCE_ENTRY,
} from "@/constants/plugins";
import { bareSpecifiers } from "@/plugins/blobModule";

/**
 * `bun scripts/build-plugins.ts [id …]` — the **only** way an entry file is made
 * (M4.6, spec 040 §Build, install, develop). It reads a plugin's committed source
 * under `plugins/<id>/main.tsx|main.ts` and writes one ES module to
 * `public/plugins/<id>/main.js` (gitignored: a generated artifact, not source).
 *
 * `react` and `react/jsx-runtime` are resolved to shims that read the host globals
 * `__ocReact` / `__ocJsx`, so a plugin uses the app's own React and the emitted
 * file **imports nothing** — a bundled app has no module resolver for a plugin
 * directory, and a `Blob`-imported module has no base URL for a relative one. Every
 * other bare import is bundled; `react-dom` is deliberately left external and the
 * bare-specifier check below then **fails the build**, because a plugin never gets a
 * second React DOM.
 *
 * The check is `plugins/blobModule.ts`'s own `bareSpecifiers`, the exact function
 * the loader refuses with, so the build and the load can never disagree about what
 * "imports nothing" means.
 */

const VIRTUAL_PREFIX = "\0oc-host-global:";

const [REACT_SPECIFIER, JSX_SPECIFIER] = PLUGIN_HOST_GLOBAL_SPECIFIERS;

/** A shim module: the global's own properties, re-exported so a plugin's imports resolve. */
function shim(namespace: object, globalName: string): string {
	const names = Object.keys(namespace).filter(
		(name) => name !== "default" && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name),
	);
	const lines = names.map((name) => `export const ${name} = m.${name};`);
	return `const m = globalThis.${globalName};\nexport default m.default ?? m;\n${lines.join("\n")}\n`;
}

function hostGlobalsPlugin(): Plugin {
	const shims = new Map<string, string>([
		[REACT_SPECIFIER, shim(React, HOST_GLOBAL.react)],
		[JSX_SPECIFIER, shim(jsxRuntime, HOST_GLOBAL.jsx)],
	]);
	return {
		name: "oc-host-globals",
		enforce: "pre",
		resolveId(id) {
			return shims.has(id) ? `${VIRTUAL_PREFIX}${id}` : null;
		},
		load(id) {
			if (!id.startsWith(VIRTUAL_PREFIX)) return null;
			return shims.get(id.slice(VIRTUAL_PREFIX.length)) ?? null;
		},
	};
}

function entryOf(id: string): string {
	const directory = resolve(PLUGIN_SOURCE_DIR, id);
	for (const name of PLUGIN_SOURCE_ENTRY) {
		const candidate = join(directory, name);
		if (existsSync(candidate)) return candidate;
	}
	throw new Error(`build-plugins: no ${PLUGIN_SOURCE_ENTRY.join(" or ")} under ${directory}`);
}

/** Every plugin directory, or the ids named on the command line. */
function idsFrom(args: readonly string[]): string[] {
	if (args.length > 0) return [...args];
	if (!existsSync(PLUGIN_SOURCE_DIR)) return [];
	return readdirSync(PLUGIN_SOURCE_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

async function buildOne(id: string): Promise<void> {
	const result = await build({
		configFile: false,
		logLevel: "warn",
		plugins: [hostGlobalsPlugin()],
		/* Vite's own JSX switch. The `esbuild` spelling is a deprecated alias Vite converts
		   to exactly these keys, but its types come from the uninstalled `esbuild` package,
		   so only this spelling type-checks. Same resolved config either way. */
		oxc: { jsx: { runtime: "automatic", importSource: "react" } },
		build: {
			lib: { entry: entryOf(id), formats: ["es"], fileName: () => PLUGIN_ENTRY_DEFAULT },
			write: false,
			minify: true,
			target: "esnext",
			rollupOptions: {
				external: [...PLUGIN_REFUSED_SPECIFIERS],
				// The shim re-exports every name of the host's React; a plugin uses a
				// handful. Without this the minifier keeps each `m.X` read as a possible
				// getter call and the dead ones survive into the entry.
				treeshake: { propertyReadSideEffects: false },
			},
		},
	});
	const output = Array.isArray(result) ? result[0] : result;
	/* `build()` widens its result to include `RolldownWatcher` (a caller may set
	   `build.watch`; this one never does), so narrow instead of casting. */
	if (!("output" in output)) {
		throw new Error("build-plugins: build() returned a watcher");
	}
	const chunks = output.output.filter((one) => one.type === "chunk");
	if (chunks.length !== 1) {
		throw new Error(
			`build-plugins: "${id}" produced ${chunks.length} chunks; a plugin's entry must be one file`,
		);
	}
	const chunk = chunks[0];
	const assets = output.output.filter((one) => one.type === "asset").map((one) => one.fileName);
	if (assets.length > 0) {
		throw new Error(
			`build-plugins: "${id}" emitted ${assets.length} asset(s) (${assets.join(", ")}); a plugin's entry must be one file`,
		);
	}
	const bare = bareSpecifiers(chunk.code);
	if (bare.length > 0) {
		const names = bare.map((specifier) => `"${specifier}"`).join(", ");
		throw new Error(
			`build-plugins: the entry for "${id}" still imports ${names}; a built entry must import nothing`,
		);
	}
	const directory = resolve(PLUGIN_OUT_DIR, id);
	rmSync(directory, { recursive: true, force: true });
	mkdirSync(directory, { recursive: true });
	const file = join(directory, PLUGIN_ENTRY_DEFAULT);
	writeFileSync(file, chunk.code);
	console.log(`build-plugins: ${id} -> ${file} (${Buffer.byteLength(chunk.code)} bytes)`);
}

const ids = idsFrom(process.argv.slice(2));
if (ids.length === 0) {
	console.log(`build-plugins: no plugin directories under ${PLUGIN_SOURCE_DIR}/`);
} else {
	for (const id of ids) await buildOne(id);
}
