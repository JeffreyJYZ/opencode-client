import { afterEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { SHORTCUT_INTERRUPT } from "@/constants/keys";
import { CONTEXT_MENU_LABEL, TRANSCRIPT_REGION_TARGET } from "@/constants/menu";

/**
 * The transcript region's own menu (M5.1): one menu for the region rather than one
 * per row, with the session's turn as its own item. The row-anchored half — the
 * target is the row under the pointer, and the menu closes when that row leaves the
 * store — is asserted in `TranscriptView.test.tsx` against real captured rows.
 */

afterEach(cleanup);

const REGION = "Transcript";

function menu(): HTMLElement {
	return screen.getByRole("menu", { name: CONTEXT_MENU_LABEL });
}

/** The accelerator a menu prints for the item with this label. */
function acceleratorFor(label: string): string | null {
	const item = screen.getByRole("menuitem", { name: new RegExp(label) });
	return item.querySelector("span:last-child")?.textContent ?? null;
}

describe("the transcript region's context menu", () => {
	const interrupting: Array<{ sessionID: string }> = [];
	const client = {
		session: {
			interrupt: (input: { sessionID: string }) => {
				interrupting.push(input);
				return Promise.resolve();
			},
		},
	} as unknown as OpenCodeClient;

	test("interrupting a running turn calls the one typed seam's client", async () => {
		render(<TranscriptView rows={[]} sessionID="ses_1" running client={client} />);
		fireEvent.contextMenu(screen.getByRole("region", { name: REGION }));
		expect(acceleratorFor(SHORTCUT_INTERRUPT.description)).toBe(SHORTCUT_INTERRUPT.label);
		fireEvent.click(
			screen.getByRole("menuitem", { name: new RegExp(SHORTCUT_INTERRUPT.description) }),
		);
		await Promise.resolve();
		expect(interrupting).toEqual([{ sessionID: "ses_1" }]);
	});

	test("the region itself is the ⇧F10 target, so focus returns to it", () => {
		render(<TranscriptView rows={[]} sessionID="ses_1" running={false} />);
		const region = screen.getByRole("region", { name: REGION });
		fireEvent.keyDown(region, { key: "F10", shiftKey: true });
		expect(menu()).toBeDefined();
		fireEvent.keyDown(menu(), { key: "Escape" });
		expect(document.activeElement).toBe(region);
		expect(TRANSCRIPT_REGION_TARGET).toBeTruthy();
	});
});
