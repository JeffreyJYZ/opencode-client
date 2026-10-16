import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { ToolRow } from "@/components/transcript/ToolRow";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { COPY_LABEL } from "@/constants/native";
import { SLOT } from "@/constants/slots";
import { TRANSCRIPT_LABEL } from "@/constants/transcriptUi";
import { clearFaults } from "@/plugins/faults";
import { probeSlot, slotMarker } from "@/test/slotProbe";
import { toolRow } from "@/test/transcriptRows";

/**
 * The transcript's two slots (M4.12): `row.actions` inside a row's action strip,
 * `footer` inside the region after the rows. Both are plain `<Slot>`s, so the
 * empty case is the header and the region exactly as they were.
 */

afterEach(cleanup);
beforeEach(clearFaults);

describe("transcript.row.actions", () => {
	test("renders nothing when empty, and the two built-ins still render", () => {
		const { container } = render(<ToolRow row={toolRow()} />);
		expect(screen.queryByText(slotMarker(SLOT.transcriptRowActions))).toBeNull();
		expect(container.textContent).toContain(COPY_LABEL);
	});

	test("renders a contribution inside the row's action strip", () => {
		const probe = probeSlot(SLOT.transcriptRowActions);
		try {
			const { container } = render(<ToolRow row={toolRow()} />);
			const marker = screen.getByText(slotMarker(SLOT.transcriptRowActions));
			expect(container.querySelector("header")?.contains(marker)).toBe(true);
		} finally {
			probe.dispose();
		}
	});
});

describe("transcript.footer", () => {
	const view = () => <TranscriptView rows={[]} sessionID="ses_m412" running={false} />;

	test("renders nothing when empty", () => {
		render(view());
		expect(screen.queryByText(slotMarker(SLOT.transcriptFooter))).toBeNull();
	});

	test("renders a contribution inside the region, after the rows", () => {
		const probe = probeSlot(SLOT.transcriptFooter);
		try {
			const { container } = render(view());
			const region = container.querySelector(`[aria-label="${TRANSCRIPT_LABEL}"]`);
			const marker = screen.getByText(slotMarker(SLOT.transcriptFooter));
			expect(region?.contains(marker)).toBe(true);
		} finally {
			probe.dispose();
		}
	});
});
