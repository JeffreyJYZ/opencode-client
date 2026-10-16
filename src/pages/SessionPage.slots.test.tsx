import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { SLOT } from "@/constants/slots";
import { SessionPage } from "@/pages/SessionPage";
import { clearFaults } from "@/plugins/faults";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";
import { probeSlot, slotMarker } from "@/test/slotProbe";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * `session.toolbar` (M4.12): a toolbar row above the transcript. It is a
 * `SlotRegion`, so an empty slot leaves **no** bar — the assertion that separates
 * a host from a placeholder.
 */

afterEach(cleanup);
beforeEach(() => {
	resetSettingsState();
	clearFaults();
});

function renderSession() {
	const { client } = fakeClient(fakeStream());
	return render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<SessionPage id="ses_m412" />
		</ClientProvider>,
	);
}

describe("the session toolbar slot", () => {
	test("is absent — not an empty bar — while nothing is registered", () => {
		const { container } = renderSession();
		expect(container.querySelector(`[data-slot="${SLOT.sessionToolbar}"]`)).toBeNull();
		expect(screen.queryByText(slotMarker(SLOT.sessionToolbar))).toBeNull();
	});

	test("renders a contribution above the transcript", () => {
		const probe = probeSlot(SLOT.sessionToolbar);
		try {
			const { container } = renderSession();
			const region = container.querySelector(`[data-slot="${SLOT.sessionToolbar}"]`);
			expect(region).not.toBeNull();
			expect(region?.textContent).toBe(slotMarker(SLOT.sessionToolbar));
			expect(region?.nextElementSibling?.tagName).toBe("MAIN");
		} finally {
			probe.dispose();
		}
	});
});
