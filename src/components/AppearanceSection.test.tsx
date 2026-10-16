import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getSettings } from "@/app/settings/store";
import { AppearanceSection } from "@/components/AppearanceSection";
import { APPEARANCE_FOLLOW_SYSTEM_LABEL } from "@/constants/appearance";
import { FOLLOW_SYSTEM_THEME_ID, THEME_ATTRIBUTE, THEME_MODE } from "@/constants/theme";
import { resetSettingsState } from "@/test/settings";
import { PROOF_THEME, stubMedia } from "@/test/theme";
import { registerTheme, resetThemeService } from "@/theme/service";

/**
 * The Appearance section (M3.5/M3.6): the control lists the theme **registry**,
 * led by the **Follow system** choice whose value is the sentinel, and choosing
 * one writes the blob — `settings.theme` — which the theme service applies. So the
 * choice survives a reload through the store, not through component state, a
 * plugin's theme is offered beside the built-in pair with no change here, and
 * follow-system resolves through the stubbed media object (the real OS flip is
 * the user's hand check).
 */

afterEach(cleanup);

afterEach(() => {
	resetThemeService();
});

beforeEach(() => {
	resetSettingsState();
	resetThemeService();
});

describe("AppearanceSection", () => {
	test("offers every registered theme, led by follow-system, with the stored one selected", () => {
		render(<AppearanceSection />);
		const select = screen.getByLabelText("Theme") as HTMLSelectElement;
		expect([...select.options].map((option) => option.value)).toEqual([
			FOLLOW_SYSTEM_THEME_ID,
			"dark",
			"light",
		]);
		expect(select.options[0]?.textContent).toBe(APPEARANCE_FOLLOW_SYSTEM_LABEL);
		expect(select.value).toBe("dark");
	});

	test("choosing follow-system stores the sentinel and the marker follows the system", () => {
		const media = stubMedia(false);
		try {
			render(<AppearanceSection />);
			const select = screen.getByLabelText("Theme") as HTMLSelectElement;
			fireEvent.change(select, { target: { value: FOLLOW_SYSTEM_THEME_ID } });
			expect(getSettings().theme).toBe(FOLLOW_SYSTEM_THEME_ID);
			expect(select.value).toBe(FOLLOW_SYSTEM_THEME_ID);
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_MODE.light);

			act(() => {
				media.flip(true);
			});
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(THEME_MODE.dark);
		} finally {
			media.restore();
		}
	});

	test("choosing a theme stores it and applies it to the root", () => {
		render(<AppearanceSection />);
		const select = screen.getByLabelText("Theme") as HTMLSelectElement;
		fireEvent.change(select, { target: { value: "light" } });
		expect(getSettings().theme).toBe("light");
		expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe("light");
		expect(screen.getByRole("status").textContent).toContain("Light");
	});

	test("a plugin's registered theme is offered and selectable", () => {
		const disposable = registerTheme(PROOF_THEME);
		try {
			render(<AppearanceSection />);
			const select = screen.getByLabelText("Theme") as HTMLSelectElement;
			expect([...select.options].map((option) => option.value)).toContain(PROOF_THEME.id);
			fireEvent.change(select, { target: { value: PROOF_THEME.id } });
			expect(getSettings().theme).toBe(PROOF_THEME.id);
			expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe(PROOF_THEME.mode);
		} finally {
			disposable.dispose();
		}
	});
});
