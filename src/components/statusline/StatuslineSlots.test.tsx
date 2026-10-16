import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient } from "@opencode/client";
import { act, cleanup, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { Statusline } from "@/components/statusline/Statusline";
import { SLOT } from "@/constants/slots";
import { STATUSLINE_LABEL } from "@/constants/statusline";
import { clearFaults } from "@/plugins/faults";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { resetSettingsState } from "@/test/settings";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * `statusline.left` / `statusline.right` (M4.12): the two ends of the bar. Plain
 * `<Slot>`s inside the existing groups, so the two ends keep their layout when
 * nothing is registered.
 */

afterEach(cleanup);
beforeEach(() => {
	resetSettingsState();
	clearFaults();
});

const SESSION_ID = "ses_m412_statusline";

/** A client whose two reads resolve, so the footer paints a resolved location. */
function client(): OpenCodeClient {
	const summary = {
		id: SESSION_ID,
		cost: 0,
		tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
		time: { created: 1, updated: 1 },
		location: { directory: "/tmp/m412" },
	};
	return {
		session: { get: async () => summary },
		vcs: { get: async () => ({ data: { branch: { current: "main" } } }) },
	} as unknown as OpenCodeClient;
}

function renderStatusline() {
	return render(
		<ClientProvider client={client()} probe={() => Promise.resolve()}>
			<Statusline />
		</ClientProvider>,
	);
}

describe("the statusline slots", () => {
	test("render nothing when empty", async () => {
		act(() => navigate(sessionRoute(SESSION_ID)));
		renderStatusline();
		await flush();
		expect(screen.queryByText(slotMarker(SLOT.statuslineLeft))).toBeNull();
		expect(screen.queryByText(slotMarker(SLOT.statuslineRight))).toBeNull();
	});

	test("render at the two ends of the bar", async () => {
		const left = probeSlot(SLOT.statuslineLeft);
		const right = probeSlot(SLOT.statuslineRight);
		try {
			act(() => navigate(sessionRoute(SESSION_ID)));
			renderStatusline();
			await flush();
			const bar = screen.getByLabelText(STATUSLINE_LABEL);
			const leftMarker = screen.getByText(slotMarker(SLOT.statuslineLeft));
			const rightMarker = screen.getByText(slotMarker(SLOT.statuslineRight));
			expect(bar.firstElementChild?.firstElementChild).toBe(leftMarker);
			expect(bar.lastElementChild?.lastElementChild).toBe(rightMarker);
		} finally {
			left.dispose();
			right.dispose();
		}
	});
});
