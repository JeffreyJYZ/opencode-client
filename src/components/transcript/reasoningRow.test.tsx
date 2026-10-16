import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ReasoningRow } from "@/components/transcript/ReasoningRow";
import { formatDuration, reasoningTitle } from "@/components/transcript/reasoningModel";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { ROW_KIND } from "@/constants/transcript";
import {
	REASONING_EXPANDED_ATTR,
	REASONING_GROUP_MARK,
	REASONING_LABEL,
	REASONING_SEPARATOR,
	REASONING_TITLE_SEPARATOR,
} from "@/constants/transcriptUi";
import { capPayload } from "@/session/payloadCaps";
import { resetReasoningExpansion } from "@/session/reasoningExpansion";
import type { TextRow } from "@/session/transcript";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(() => {
	cleanup();
	resetReasoningExpansion();
});

/**
 * M2.17's acceptance (spec 020 §Transcript, §Acceptance): the reasoning row is a
 * collapsed group — a summary that opens to the text — expandable **while it is
 * still streaming**, keeping its duration once finished, with the expansion
 * remembered per session. The memory is keyed by the session-scoped row id, so a
 * session switch is the row unmounting and the row id coming back.
 */

const CREATED = 1_000;
const RAN_FOR_MS = 1_200;

function reasoningRow(overrides: Partial<TextRow> = {}): TextRow {
	return {
		id: "msg_a:r0",
		created: CREATED,
		seq: 1,
		kind: ROW_KIND.reasoning,
		text: capPayload("Let me think."),
		ended: false,
		...overrides,
	};
}

/** The group's toggle, found by the attribute that carries its state. */
function toggle(container: HTMLElement): HTMLElement {
	const node = container.querySelector(`[${REASONING_EXPANDED_ATTR}]`);
	if (node === null) throw new Error("the reasoning row has no group toggle");
	return node as HTMLElement;
}

function expanded(container: HTMLElement): boolean {
	return toggle(container).getAttribute(REASONING_EXPANDED_ATTR) === "true";
}

/** The summary line's text, with its collapsed mark. */
function summary(container: HTMLElement): string {
	return toggle(container).textContent ?? "";
}

describe("the reasoning group", () => {
	test("is collapsed: it shows the summary and not the text", () => {
		const { container } = render(<ReasoningRow row={reasoningRow()} />);
		expect(summary(container)).toBe(`${REASONING_GROUP_MARK} ${REASONING_LABEL}`);
		expect(container.querySelector("p")).toBeNull();
	});

	test("expands to the reasoning text on a click", () => {
		const { container } = render(<ReasoningRow row={reasoningRow()} />);
		fireEvent.click(toggle(container));
		expect(expanded(container)).toBe(true);
		expect(container.querySelector("p")?.textContent).toBe("Let me think.");
	});

	test("expands while the stream is still running", () => {
		// No `.ended` frame has arrived: `ended` is false and there is no duration yet.
		const live = reasoningRow({ ended: false });
		const { container } = render(<ReasoningRow row={live} />);
		expect(expanded(container)).toBe(false);
		fireEvent.click(toggle(container));
		expect(expanded(container)).toBe(true);
		expect(container.querySelector("p")?.textContent).toBe("Let me think.");
	});
});

describe("the group's summary", () => {
	test("prints no duration while the part is still streaming", () => {
		const { container } = render(<ReasoningRow row={reasoningRow({ ended: false })} />);
		// The whole line, so an invented duration cannot hide behind a substring.
		expect(summary(container)).toBe(`${REASONING_GROUP_MARK} ${REASONING_LABEL}`);
	});

	test("shows the duration once the `.ended` frame lands, and keeps it", () => {
		const { container, rerender } = render(
			<ReasoningRow row={reasoningRow({ ended: false })} />,
		);
		expect(summary(container)).not.toContain(formatDuration(RAN_FOR_MS));
		rerender(
			<ReasoningRow row={reasoningRow({ ended: true, endedAt: CREATED + RAN_FOR_MS })} />,
		);
		expect(summary(container)).toBe(
			`${REASONING_GROUP_MARK} ${REASONING_LABEL}${REASONING_TITLE_SEPARATOR}${formatDuration(RAN_FOR_MS)}`,
		);
	});

	test("names the model's own title when the part opens with one", () => {
		const text = "**Inspecting the parser**\n\nNow let me look.";
		const { container } = render(
			<ReasoningRow
				row={reasoningRow({ text: capPayload(text), ended: true, endedAt: CREATED })}
			/>,
		);
		expect(summary(container)).toBe(
			`${REASONING_GROUP_MARK} ${REASONING_LABEL}${REASONING_TITLE_SEPARATOR}${reasoningTitle(text)}${REASONING_SEPARATOR}${formatDuration(0)}`,
		);
	});
});

describe("the remembered expansion", () => {
	test("survives a session switch", () => {
		const row = reasoningRow();
		const first = render(<TranscriptView rows={[row]} sessionID="ses_a" running={true} />);
		fireEvent.click(toggle(first.container));
		expect(expanded(first.container)).toBe(true);
		first.unmount();
		// Another session's transcript mounts and leaves in between.
		const other = reasoningRow({ id: "msg_b:r0", text: capPayload("Another session.") });
		const second = render(<TranscriptView rows={[other]} sessionID="ses_b" running={false} />);
		second.unmount();
		// Back on the first session: the group is still open.
		const back = render(<TranscriptView rows={[row]} sessionID="ses_a" running={true} />);
		expect(expanded(back.container)).toBe(true);
	});
});
