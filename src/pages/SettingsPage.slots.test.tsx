import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { ROUTE_KIND } from "@/constants/routes";
import { SLOT } from "@/constants/slots";
import { SettingsPage } from "@/pages/SettingsPage";
import { clearFaults } from "@/plugins/faults";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * `settings.sections` (M4.12): after every section the registry renders, inside
 * the same surface. A plain `<Slot>`, so an empty one adds no node and the surface
 * keeps the sections it had.
 */

afterEach(cleanup);
beforeEach(clearFaults);

function surfaceOf(container: HTMLElement): Element | null {
	return container.querySelector(`[data-route="${ROUTE_KIND.settings}"]`);
}

function renderSurface() {
	return render(
		<Providers>
			<SettingsPage />
		</Providers>,
	);
}

describe("the settings sections slot", () => {
	test("renders nothing when empty", () => {
		const { container } = renderSurface();
		expect(screen.queryByText(slotMarker(SLOT.settingsSections))).toBeNull();
		expect(surfaceOf(container)?.textContent).not.toContain(slotMarker(SLOT.settingsSections));
	});

	test("renders after every registered section", () => {
		const probe = probeSlot(SLOT.settingsSections);
		try {
			const { container } = renderSurface();
			const surface = surfaceOf(container);
			expect(surface?.lastElementChild?.textContent).toBe(slotMarker(SLOT.settingsSections));
		} finally {
			probe.dispose();
		}
	});
});
