import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { DELIVERY, type Delivery, ROW_KIND } from "@/constants/transcript";
import { RAIL_LABEL, REASONING_EXPANDED_ATTR, REASONING_LABEL } from "@/constants/transcriptUi";
import { capPayload } from "@/session/payloadCaps";
import type { ErrorRow, FooterRow, NoticeRow, TextRow, UserRow } from "@/session/transcript";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

const userRow = (delivery: Delivery, text = "hello"): UserRow => ({
	id: "msg_a",
	created: 1,
	seq: 1,
	kind: ROW_KIND.user,
	text,
	delivery,
});

const textRow = (kind: TextRow["kind"], text: string, id = "msg_a:t0"): TextRow => ({
	id,
	created: 1,
	seq: 2,
	kind,
	text: capPayload(text),
	ended: false,
});

describe("the user band", () => {
	test("shows the prompt and a rail word for the store's delivery value", () => {
		const { container, rerender } = render(<TranscriptEntry row={userRow(DELIVERY.queued)} />);
		expect(container.querySelector('[data-row="msg_a"]')).not.toBeNull();
		expect(screen.getByText("hello")).toBeDefined();
		// The rail carries the store's own value, not a component's guess.
		expect(container.querySelector("[data-rail]")?.getAttribute("data-rail")).toBe(
			DELIVERY.queued,
		);
		// …and a word, so the two states never differ by colour alone.
		expect(screen.getByText(RAIL_LABEL.queued)).toBeDefined();
		rerender(<TranscriptEntry row={userRow(DELIVERY.delivered)} />);
		expect(screen.getByText(RAIL_LABEL.delivered)).toBeDefined();
		expect(screen.queryByText(RAIL_LABEL.queued)).toBeNull();
	});
});

describe("the two text families", () => {
	test("prose renders as primary text with no reasoning marker", () => {
		render(<TranscriptEntry row={textRow(ROW_KIND.prose, "Hello there.")} />);
		expect(screen.getByText("Hello there.")).toBeDefined();
		expect(screen.queryByText(REASONING_LABEL)).toBeNull();
	});

	test("reasoning is a collapsed group: the marker shows, the text does not", () => {
		const { container } = render(
			<TranscriptEntry row={textRow(ROW_KIND.reasoning, "Let me think.", "msg_a:r0")} />,
		);
		const toggle = container.querySelector(`[${REASONING_EXPANDED_ATTR}]`);
		expect(toggle?.textContent).toContain(REASONING_LABEL);
		expect(toggle?.getAttribute(REASONING_EXPANDED_ATTR)).toBe("false");
		expect(screen.queryByText("Let me think.")).toBeNull();
	});

	test("the two families differ by the type scale, not by colour only", () => {
		const { container: prose } = render(<TranscriptEntry row={textRow(ROW_KIND.prose, "p")} />);
		const { container: reasoning } = render(
			<TranscriptEntry row={textRow(ROW_KIND.reasoning, "r", "msg_b:r0")} />,
		);
		const proseSize = containerSize(prose);
		const reasoningSize = groupSize(reasoning);
		expect(reasoningSize).toBe("var(--oc-font-size-meta)");
		expect(proseSize).not.toBe(reasoningSize);
	});
});

/** The rendered text element's font size, whichever element carries the row's text. */
function containerSize(container: HTMLElement): string {
	const element = container.querySelector("article p") as HTMLElement;
	return element.style.fontSize;
}

/** The collapsed group's own size: the summary line is the reasoning row's marker. */
function groupSize(container: HTMLElement): string {
	const element = container.querySelector(`[${REASONING_EXPANDED_ATTR}]`) as HTMLElement;
	return element.style.fontSize;
}

describe("the remaining row families", () => {
	test("a notice renders its own sentence", () => {
		const row: NoticeRow = {
			id: "notice:compaction",
			created: 1,
			seq: 3,
			kind: ROW_KIND.notice,
			text: "Compacting context",
		};
		render(<TranscriptEntry row={row} />);
		expect(screen.getByText("Compacting context")).toBeDefined();
	});

	test("an error is announced, not merely painted", () => {
		const row: ErrorRow = {
			id: "error:evt_1",
			created: 1,
			seq: 4,
			kind: ROW_KIND.error,
			message: "Model exo-free has been deprecated.",
		};
		render(<TranscriptEntry row={row} />);
		expect(screen.getByRole("alert").textContent).toBe("Model exo-free has been deprecated.");
	});

	test("a footer shows the finish word, and its cost when the step had one", () => {
		const bare: FooterRow = {
			id: "msg_a:f",
			created: 1,
			seq: 5,
			kind: ROW_KIND.footer,
			finish: "stop",
		};
		const { unmount } = render(<TranscriptEntry row={bare} />);
		expect(screen.getByText("stop")).toBeDefined();
		unmount();
		render(<TranscriptEntry row={{ ...bare, cost: 0.0012 }} />);
		expect(screen.getByText("stop · 0.0012")).toBeDefined();
	});
});
