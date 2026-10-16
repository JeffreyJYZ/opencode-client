import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getSettings } from "@/app/settings/store";
import { AppearanceSection } from "@/components/AppearanceSection";
import { THEME_ATTRIBUTE } from "@/constants/theme";
import { resetSettingsState } from "@/test/settings";
import { PROOF_THEME } from "@/test/theme";
import { registerTheme, resetThemeService } from "@/theme/service";

/**
 * The Appearance section (M3.5): the control lists the theme **registry**, and
 * choosing one writes the blob — `settings.theme` — and the theme service applies
 * it. So the choice survives a reload through the store, not through component
 * state, and a plugin's theme is offered beside the built-in pair with no change
 * here.
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
	test("offers every registered theme, with the stored one selected", () => {
		render(<AppearanceSection />);
		const select = screen.getByLabelText("Theme") as HTMLSelectElement;
		expect([...select.options].map((option) => option.value)).toEqual(["dark", "light"]);
		expect(select.value).toBe("dark");
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
