import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Server markdown → sanitised, position-keyed blocks (M2.3).
 *
 * The server's prose is **untrusted input**: nothing from it reaches the DOM
 * before DOMPurify has seen it, so a `<script>`, an `onerror` handler or a
 * `javascript:` link in the source is gone from the output rather than merely
 * unused.
 *
 * Parsing is positional: each top-level token becomes one block, whose `key` is
 * its position among the rendered tokens. A streamed delta changes the last block
 * and leaves every earlier key alone, so an append does not re-mount the prose
 * above it.
 */

export type MarkdownBlock =
	| { readonly key: string; readonly kind: "html"; readonly html: string }
	| {
			readonly key: string;
			readonly kind: "code";
			readonly code: string;
			readonly language: string;
	  };

export function markdownBlocks(text: string): MarkdownBlock[] {
	return marked
		.lexer(text)
		.filter((token) => token.type !== "space")
		.map((token, position) => {
			const key = String(position);
			if (token.type === "code") {
				return {
					key,
					kind: "code" as const,
					code: token.text,
					language: firstWord(token.lang ?? ""),
				};
			}
			return { key, kind: "html" as const, html: sanitizeHtml(marked.parser([token])) };
		});
}

/**
 * The one boundary between the server's HTML and the page. The profile is HTML
 * only (no SVG/MathML namespaces), which strips `<script>`, event-handler
 * attributes and `javascript:`/`data:` URLs.
 */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

/** A fence's info string's first word, lower-cased: `ts title="x"` names `ts`. */
function firstWord(info: string): string {
	return (info.trim().split(/\s+/)[0] ?? "").toLowerCase();
}
