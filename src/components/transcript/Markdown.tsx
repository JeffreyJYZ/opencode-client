import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import { MARKDOWN_BLOCK_ATTR } from "@/constants/markdown";
import { CodeBlock } from "./CodeBlock";
import { isExternalHref, openExternal } from "./externalLink";
import { markdownBlocks } from "./markdownBlocks";
import { TEXT_STYLE } from "./rowStyles";

/**
 * Assistant prose, rendered from the server's markdown (M2.3).
 *
 * Blocks are keyed by **position** (`block.key`): a streamed delta rewrites the
 * last block and leaves every earlier key alone, so nothing above it re-mounts.
 * The container owns one native click listener for every link inside it — links
 * come from `dangerouslySetInnerHTML`, so a React handler cannot be attached to
 * them individually — and the webview is never navigated: only a link that leaves
 * the app is handed to the host.
 */

const CONTAINER_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
};

/** Markdown's own block layout: `pre-wrap` would read the rendered HTML's newlines. */
const BLOCK_STYLE: CSSProperties = { ...TEXT_STYLE, whiteSpace: "normal" };

/** One delegated handler for every anchor the markdown produced. */
function handleLink(event: MouseEvent): void {
	const target = event.target instanceof Element ? event.target : null;
	const href = target?.closest("a")?.getAttribute("href");
	if (href === null || href === undefined) return;
	event.preventDefault();
	if (isExternalHref(href)) openExternal(href);
}

export function Markdown({ text }: { readonly text: string }) {
	const blocks = useMemo(() => markdownBlocks(text), [text]);
	const container = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const element = container.current;
		if (element === null) return;
		element.addEventListener("click", handleLink);
		return () => {
			element.removeEventListener("click", handleLink);
		};
	}, []);
	return (
		<div ref={container} style={CONTAINER_STYLE}>
			{blocks.map((block) => (
				<div key={block.key} {...{ [MARKDOWN_BLOCK_ATTR]: block.key }}>
					{block.kind === "code" ? (
						<CodeBlock code={block.code} language={block.language} />
					) : (
						// biome-ignore lint/security/noDangerouslySetInnerHtml: block.html is sanitised by DOMPurify in markdownBlocks
						<div style={BLOCK_STYLE} dangerouslySetInnerHTML={{ __html: block.html }} />
					)}
				</div>
			))}
		</div>
	);
}
