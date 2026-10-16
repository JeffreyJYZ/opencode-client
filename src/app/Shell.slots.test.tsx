import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { Shell } from "@/app/Shell";
import { requestCommandPalette } from "@/app/tabSync";
import { PALETTE_DIALOG_LABEL } from "@/constants/palette";
import { ROUTE_PATH } from "@/constants/routes";
import { SLOT } from "@/constants/slots";
import { clearFaults } from "@/plugins/faults";
import { resetSettingsState } from "@/test/settings";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * `overlays` (M4.12): a plugin's window-level overlay **beside** the three
 * built-ins, never instead of them. The second assertion is the point — the
 * built-in command palette still opens with the slot present and with it empty.
 */

afterEach(cleanup);
beforeEach(() => {
	resetSettingsState();
	clearFaults();
	window.history.pushState(null, "", ROUTE_PATH.home);
});

function renderShell() {
	return render(
		<Providers>
			<Shell />
		</Providers>,
	);
}

describe("the overlays slot", () => {
	test("renders nothing when empty, and the built-in palette still opens", () => {
		renderShell();
		expect(screen.queryByText(slotMarker(SLOT.overlays))).toBeNull();
		act(() => requestCommandPalette());
		expect(screen.getByLabelText(PALETTE_DIALOG_LABEL)).toBeDefined();
	});

	test("renders a contribution, and the built-in palette still opens", () => {
		const probe = probeSlot(SLOT.overlays);
		try {
			renderShell();
			expect(screen.getByText(slotMarker(SLOT.overlays))).toBeDefined();
			act(() => requestCommandPalette());
			expect(screen.getByLabelText(PALETTE_DIALOG_LABEL)).toBeDefined();
		} finally {
			probe.dispose();
		}
	});
});
