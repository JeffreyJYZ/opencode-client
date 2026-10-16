import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { footerText } from "@/components/transcript/rowModel";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { DELIVERY, type Delivery, ROW_KIND } from "@/constants/transcript";
import { RAIL_LABEL, REASONING_LABEL } from "@/constants/transcriptUi";
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

	test("reasoning carries a marker and its own text", () => {
		render(<TranscriptEntry row={textRow(ROW_KIND.reasoning, "Let me think.", "msg_a:r0")} />);
		expect(screen.getByText(REASONING_LABEL)).toBeDefined();
		expect(screen.getByText("Let me think.")).toBeDefined();
	});

	test("the two families differ by the type scale, not by colour only", () => {
		const { container: prose } = render(<TranscriptEntry row={textRow(ROW_KIND.prose, "p")} />);
		const { container: reasoning } = render(
			<TranscriptEntry row={textRow(ROW_KIND.reasoning, "r", "msg_b:r0")} />,
		);
		const proseSize = containerSize(prose);
		const reasoningSize = containerSize(reasoning);
		expect(reasoningSize).toBe("var(--oc-font-size-meta)");
		expect(proseSize).not.toBe(reasoningSize);
	});
});

/** The rendered text element's font size, whichever element carries the row's text. */
function containerSize(container: HTMLElement): string {
	const element = container.querySelector("article p") as HTMLElement;
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

	test("a footer shows the step's own agent, model, duration and rate", () => {
		const row: FooterRow = {
			id: "msg_a:f",
			created: 1,
			seq: 5,
			kind: ROW_KIND.footer,
			agent: "build",
			model: { id: "cat-jam-free", providerID: "opencode" },
			durationMs: 2000,
			outputTokens: 30,
		};
		render(<TranscriptEntry row={row} />);
		// The line is the pure derivation's own (`rowModel.test.ts` pins its parts);
		// this asserts the row component wires it, not a second copy of the format.
		expect(screen.getByText(footerText(row))).toBeDefined();
	});
});
