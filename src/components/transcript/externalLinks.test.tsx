import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { isExternalHref } from "@/components/transcript/externalLink";
import { Markdown } from "@/components/transcript/Markdown";
import { OPEN_EXTERNAL_EVENT } from "@/constants/markdown";

/**
 * Where a rendered link goes (M5.2, requirement 2). A markdown link must **never**
 * navigate the webview: the shells refuses a foreign origin, and a same-origin move
 * would reload the app. So every click is intercepted; the one that may leave raises
 * the host signal, and one that must not raises nothing at all.
 */

afterEach(cleanup);

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
		window.addEventListener(OPEN_EXTERNAL_EVENT, listener);
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
			window.removeEventListener(OPEN_EXTERNAL_EVENT, listener);
		}
	});

	test("a javascript: link is refused: nothing is raised and nothing runs", () => {
		const seen: string[] = [];
		const listener = (event: Event): void => {
			seen.push((event as CustomEvent<string>).detail);
		};
		window.addEventListener(OPEN_EXTERNAL_EVENT, listener);
		try {
			const { container } = render(<Markdown text={"[x](javascript:window.__pwned=true)"} />);
			const before = window.location.href;
			const anchor = container.querySelector("a");
			if (anchor !== null) fireEvent.click(anchor);
			expect(seen).toEqual([]);
			expect(window.location.href).toBe(before);
			expect((window as unknown as { __pwned?: unknown }).__pwned).toBeUndefined();
		} finally {
			window.removeEventListener(OPEN_EXTERNAL_EVENT, listener);
		}
	});
});
