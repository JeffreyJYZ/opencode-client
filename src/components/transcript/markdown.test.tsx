import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { isExternalHref } from "@/components/transcript/externalLink";
import {
	highlightInvocations,
	isHighlightable,
	resetHighlight,
} from "@/components/transcript/highlight";
import { Markdown } from "@/components/transcript/Markdown";
import { markdownBlocks, sanitizeHtml } from "@/components/transcript/markdownBlocks";
import {
	HIGHLIGHT_DEBOUNCE_MS,
	HIGHLIGHT_LANGUAGES,
	MARKDOWN_BLOCK_ATTR,
} from "@/constants/markdown";

afterEach(cleanup);

describe("untrusted markdown is sanitised before it reaches the DOM", () => {
	const HOSTILE = [
		"<script>window.__pwned = true</script>",
		'<img src=x onerror="window.__pwned = true">',
		"[link](javascript:window.__pwned=true)",
		'<a href="javascript:window.__pwned=true">x</a>',
	].join("\n\n");

	test("the output carries no script tag, no event handler and no javascript: URL", () => {
		const html = markdownBlocks(HOSTILE)
			.map((block) => (block.kind === "html" ? block.html : block.code))
			.join("\n");
		expect(html).not.toContain("<script");
		expect(html).not.toContain("onerror");
		expect(html.toLowerCase()).not.toContain("javascript:");
		expect(sanitizeHtml('<img src=x onerror="alert(1)">')).not.toContain("onerror");
	});

	test("the rendered DOM has none of them either", () => {
		const { container } = render(<Markdown text={HOSTILE} />);
		expect(container.querySelectorAll("script")).toHaveLength(0);
		expect(container.querySelectorAll("[onerror]")).toHaveLength(0);
		for (const anchor of container.querySelectorAll("a")) {
			expect(anchor.getAttribute("href") ?? "").not.toContain("javascript:");
		}
	});
});

describe("blocks are keyed by position", () => {
	test("one block per top-level token, numbered from zero", () => {
		const { container } = render(<Markdown text={"one\n\ntwo\n\nthree"} />);
		const blocks = [...container.querySelectorAll(`[${MARKDOWN_BLOCK_ATTR}]`)];
		expect(blocks.map((block) => block.getAttribute(MARKDOWN_BLOCK_ATTR))).toEqual([
			"0",
			"1",
			"2",
		]);
	});

	test("a delta that rewrites the last block leaves the earlier positions alone", () => {
		const { container, rerender } = render(<Markdown text={"first\n\nsecond"} />);
		const before = container.querySelector(`[${MARKDOWN_BLOCK_ATTR}="0"]`);
		rerender(<Markdown text={"first\n\nsecond, longer"} />);
		expect(container.querySelector(`[${MARKDOWN_BLOCK_ATTR}="0"]`)).toBe(before);
	});
});

describe("highlighting is debounced, memoised and capped", () => {
	const fence = (body: string): string => `\`\`\`ts\n${body}\n\`\`\``;
	async function settle(): Promise<void> {
		await act(async () => {
			await Bun.sleep(HIGHLIGHT_DEBOUNCE_MS + 120);
		});
	}

	beforeEach(resetHighlight);

	test("a fence streamed in many deltas highlights once", async () => {
		const { rerender } = render(<Markdown text={fence("const a = 1;")} />);
		for (const body of ["const a = 12;", "const a = 123;", "const a = 1234;"]) {
			rerender(<Markdown text={fence(body)} />);
		}
		await settle();
		console.log(`M2.3 highlight invocations for one streamed fence: ${highlightInvocations()}`);
		expect(highlightInvocations()).toBe(1);
	});

	test("a re-render with the settled fence does not run the engine again", async () => {
		const text = fence("const a = 1;");
		const { rerender } = render(<Markdown text={text} />);
		await settle();
		rerender(<Markdown text={text} />);
		rerender(<Markdown text={"unrelated prose"} />);
		await settle();
		expect(highlightInvocations()).toBe(1);
	});

	test("an unknown or absurd language falls back to plain code, and never reaches the engine", async () => {
		expect(isHighlightable("zzz-not-a-language")).toBe(false);
		const { container } = render(
			<Markdown text={"```zzz-not-a-language\nconst a = 1;\n```"} />,
		);
		await settle();
		expect(highlightInvocations()).toBe(0);
		expect(container.querySelector("pre code")?.textContent).toBe("const a = 1;");
	});

	test("a capped language is highlighted, through the code face element", async () => {
		expect(isHighlightable("ts")).toBe(true);
		expect(HIGHLIGHT_LANGUAGES).toContain("ts");
		const { container } = render(<Markdown text={fence("const a = 1;")} />);
		await settle();
		expect(highlightInvocations()).toBe(1);
		const pre = container.querySelector("pre");
		expect(pre).not.toBeNull();
		// The code face reaches the block structurally — base.css maps `pre` to
		// --oc-font-code (fontGuard.test.ts refuses a family anywhere else).
		expect(pre?.tagName.toLowerCase()).toBe("pre");
		expect(container.querySelector("span[style*='--shiki']")).not.toBeNull();
	});
});

describe("links never navigate the webview", () => {
	test("external and internal hrefs are told apart", () => {
		expect(isExternalHref("https://example.com/x")).toBe(true);
		expect(isExternalHref("mailto:a@b.example")).toBe(true);
		expect(isExternalHref("/session/ses_x")).toBe(false);
		expect(isExternalHref("#frag")).toBe(false);
		expect(isExternalHref("javascript:alert(1)")).toBe(false);
	});

	test("clicking an external link dispatches the host signal and does not navigate", () => {
		const seen: string[] = [];
		const listener = (event: Event): void => {
			seen.push((event as CustomEvent<string>).detail);
		};
		window.addEventListener("oc:open-external", listener);
		try {
			const { container } = render(<Markdown text={"[site](https://example.com/x)"} />);
			const before = window.location.href;
			const anchor = container.querySelector("a");
			expect(anchor).not.toBeNull();
			fireEvent.click(anchor as HTMLAnchorElement);
			expect(seen).toEqual(["https://example.com/x"]);
			expect(window.location.href).toBe(before);
			expect(screen.getByText("site")).toBeDefined();
		} finally {
			window.removeEventListener("oc:open-external", listener);
		}
	});
});
