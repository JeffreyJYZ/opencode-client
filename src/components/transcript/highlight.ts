import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { HIGHLIGHT_LANGUAGES, HIGHLIGHT_MAX_CHARS, HIGHLIGHT_THEMES } from "@/constants/markdown";

/**
 * The highlighter seam (M2.3): one lazily-created Shiki instance, a memo keyed by
 * (language, code), and a count of the times the engine actually ran.
 *
 * The **JavaScript regex engine** is deliberate. Shiki's default engine is an
 * Oniguruma WASM module, and compiling WebAssembly needs `'wasm-unsafe-eval'` in
 * `script-src` — the M2.0 policy ships `script-src 'self'` on purpose, so the
 * highlighter uses the engine that needs no such directive and adds none.
 *
 * Memoisation is what makes a re-render free: a fence already highlighted comes
 * back from `memo` without touching the engine, so re-rendering the list for an
 * unrelated append costs nothing.
 */

let instance: Promise<HighlighterCore> | null = null;
let invocations = 0;
const memo = new Map<string, Promise<string | null>>();

/** How many times the engine ran — the debounce/memoisation proof reads this. */
export function highlightInvocations(): number {
	return invocations;
}

/** Forget what has been highlighted and how often; the loaded grammars stay. */
export function resetHighlight(): void {
	invocations = 0;
	memo.clear();
}

/** Whether a fence's language is one the cap allows. */
export function isHighlightable(language: string): boolean {
	return (HIGHLIGHT_LANGUAGES as readonly string[]).includes(language);
}

/** Highlighted HTML for a fence, or `null` when the cap refuses it. */
export function highlightCode(code: string, language: string): Promise<string | null> {
	if (!isHighlightable(language) || code.length > HIGHLIGHT_MAX_CHARS) {
		return Promise.resolve(null);
	}
	const key = `${language}\u0000${code}`;
	const hit = memo.get(key);
	if (hit !== undefined) return hit;
	const run = render(code, language);
	memo.set(key, run);
	return run;
}

async function render(code: string, language: string): Promise<string | null> {
	invocations += 1;
	const highlighter = await load();
	return highlighter.codeToHtml(code, {
		lang: language,
		themes: HIGHLIGHT_THEMES,
		defaultColor: false,
	});
}

/** The grammar modules the cap names; loaded once, on the first highlight. */
function load(): Promise<HighlighterCore> {
	instance ??= createHighlighterCore({
		themes: [import("shiki/themes/github-dark.mjs"), import("shiki/themes/github-light.mjs")],
		langs: [
			import("shiki/langs/bash.mjs"),
			import("shiki/langs/css.mjs"),
			import("shiki/langs/diff.mjs"),
			import("shiki/langs/go.mjs"),
			import("shiki/langs/html.mjs"),
			import("shiki/langs/java.mjs"),
			import("shiki/langs/javascript.mjs"),
			import("shiki/langs/json.mjs"),
			import("shiki/langs/jsx.mjs"),
			import("shiki/langs/markdown.mjs"),
			import("shiki/langs/python.mjs"),
			import("shiki/langs/ruby.mjs"),
			import("shiki/langs/rust.mjs"),
			import("shiki/langs/sql.mjs"),
			import("shiki/langs/toml.mjs"),
			import("shiki/langs/tsx.mjs"),
			import("shiki/langs/typescript.mjs"),
			import("shiki/langs/yaml.mjs"),
		],
		engine: createJavaScriptRegexEngine({ forgiving: true }),
	});
	return instance;
}
