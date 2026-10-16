import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { Shell } from "@/app/Shell";
import { resetSettingsSections } from "@/app/settings/sections";
import { openSettingsAndGo } from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { APPEARANCE_TITLE } from "@/constants/appearance";
import { CONNECT_TITLE } from "@/constants/connect";
import { KEY_ESCAPE } from "@/constants/keys";
import { PLUGINS_TITLE } from "@/constants/plugins";
import { REFERENCE_TITLE } from "@/constants/reference";
import { ROUTE_KIND, ROUTE_PATH } from "@/constants/routes";
import { TYPOGRAPHY_TITLE } from "@/constants/typography";
import { VERSION_SECTION_LABEL } from "@/constants/version";
import { clearFaults } from "@/plugins/faults";
import { resetSettingsState } from "@/test/settings";

/**
 * The settings surface as the user meets it (M3.5): one tab, every registered
 * section in registry order, focus inside on open, Escape closing the tab the way
 * ⌘W does, and a section that throws left inert with the rest still on screen.
 */

afterEach(cleanup);

afterEach(() => {
	resetSettingsSections();
	disposeTopnavBuiltins();
	clearFaults();
});

beforeEach(() => {
	resetSettingsState();
	resetSettingsSections();
	registerTopnavBuiltins();
});

/** The surface element the route renders. */
function surface(): HTMLElement {
	const element = document.querySelector(`[data-route="${ROUTE_KIND.settings}"]`);
	if (element === null) throw new Error("the settings surface did not render");
	return element as HTMLElement;
}

function headings(): (string | null)[] {
	return screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
}

describe("the settings surface", () => {
	test("renders every registered section, in registry order", () => {
		const view = render(
			<Providers>
				<Shell />
			</Providers>,
		);
		act(() => openSettingsAndGo());
		expect(
			view.container.querySelector(`[data-route="${ROUTE_KIND.settings}"]`),
		).not.toBeNull();
		expect(headings()).toEqual([
			APPEARANCE_TITLE,
			TYPOGRAPHY_TITLE,
			CONNECT_TITLE,
			PLUGINS_TITLE,
			REFERENCE_TITLE,
			VERSION_SECTION_LABEL,
		]);
	});

	test("focus enters the surface when it opens", () => {
		render(
			<Providers>
				<Shell />
			</Providers>,
		);
		act(() => openSettingsAndGo());
		expect(document.activeElement).toBe(surface());
	});

	test("Escape closes the settings tab and lands on home", () => {
		render(
			<Providers>
				<Shell />
			</Providers>,
		);
		act(() => openSettingsAndGo());
		expect(getTabSnapshot().tabs).toHaveLength(1);
		fireEvent.keyDown(surface(), { key: KEY_ESCAPE });
		expect(getTabSnapshot().tabs).toHaveLength(0);
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
		expect(document.querySelector(`[data-route="${ROUTE_KIND.settings}"]`)).toBeNull();
	});
});
