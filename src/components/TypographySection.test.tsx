import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { restoreSettings } from "@/app/settings/store";
import { TypographySection } from "@/components/TypographySection";
import {
	BUNDLED_CODE_FONT_FAMILY,
	CODE_FONT_SIZE_MAX,
	DEFAULT_CODE_FONT_FAMILY,
	DEFAULT_CODE_FONT_SIZE,
	DEFAULT_UI_FONT_FAMILY,
	DEFAULT_UI_FONT_SIZE,
	FONT_ROLE,
	FONT_VARIABLE,
	SETTINGS_STORAGE_KEY,
} from "@/constants/settings";
import {
	CODE_FAMILY_LABEL,
	CODE_SIZE_LABEL,
	FACE_REFUSED_TEXT,
	PX_UNIT,
	TYPOGRAPHY_FALLBACK_NOTE,
	TYPOGRAPHY_RESET_TEXT,
	TYPOGRAPHY_SAMPLE_CLASS,
	TYPOGRAPHY_SAMPLE_TEXT,
	UI_FAMILY_LABEL,
	UI_SIZE_LABEL,
} from "@/constants/typography";
import { fakeStorage, resetSettingsState } from "@/test/settings";
import { CSS_GENERIC_FACE } from "@/theme/faces";
import { DEFAULT_FONTS } from "@/theme/fonts";

/** RTL installs auto-cleanup once per process; this is not its first importer. */
afterEach(cleanup);
afterEach(() => {
	resetSettingsState();
	document.documentElement.removeAttribute("style");
});

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
	resetSettingsState();
	storage = fakeStorage();
	restoreSettings(storage);
});

/** The blob's font field, parsed — what a restart would read. */
function storedFonts(): unknown {
	const raw = storage.entries()[SETTINGS_STORAGE_KEY];
	if (raw === undefined) throw new Error("nothing was written");
	return (JSON.parse(raw) as Record<string, unknown>).fonts;
}

const root = (variable: string): string =>
	document.documentElement.style.getPropertyValue(variable);

const sizeLabel = (label: string): string => `${label} (${PX_UNIT})`;

/**
 * The picker commits on leave, the way a user finishes a choice (M3.3). React
 * maps `onBlur` onto the bubbling `focusout`, so that is the event to send.
 */
function choose(label: string, family: string): void {
	const input = screen.getByLabelText(label);
	fireEvent.change(input, { target: { value: family } });
	fireEvent.focusOut(input);
}

describe("TypographySection", () => {
	test("shows the shipped defaults and one live sample per role", () => {
		render(<TypographySection />);
		expect((screen.getByLabelText(UI_FAMILY_LABEL) as HTMLInputElement).value).toBe(
			DEFAULT_UI_FONT_FAMILY,
		);
		expect((screen.getByLabelText(CODE_FAMILY_LABEL) as HTMLInputElement).value).toBe(
			DEFAULT_CODE_FONT_FAMILY,
		);
		expect((screen.getByLabelText(sizeLabel(UI_SIZE_LABEL)) as HTMLInputElement).value).toBe(
			`${DEFAULT_UI_FONT_SIZE}`,
		);
		expect((screen.getByLabelText(sizeLabel(CODE_SIZE_LABEL)) as HTMLInputElement).value).toBe(
			`${DEFAULT_CODE_FONT_SIZE}`,
		);
		for (const role of [FONT_ROLE.ui, FONT_ROLE.code]) {
			const sample = document.querySelector(`.${TYPOGRAPHY_SAMPLE_CLASS[role]}`);
			expect(sample?.textContent).toBe(TYPOGRAPHY_SAMPLE_TEXT);
		}
	});

	test("a family and a size change reach the root and the blob without a reload", () => {
		render(<TypographySection />);
		choose(UI_FAMILY_LABEL, CSS_GENERIC_FACE.uiRounded);
		fireEvent.change(screen.getByLabelText(sizeLabel(CODE_SIZE_LABEL)), {
			target: { value: "17" },
		});
		expect(root(FONT_VARIABLE.uiFamily)).toBe(CSS_GENERIC_FACE.uiRounded);
		expect(root(FONT_VARIABLE.codeSize)).toBe("17px");
		expect(storedFonts()).toEqual({
			ui: { family: CSS_GENERIC_FACE.uiRounded, size: DEFAULT_UI_FONT_SIZE },
			code: { family: DEFAULT_CODE_FONT_FAMILY, size: 17 },
		});
	});

	test("a size outside the role's range is clamped to it", () => {
		render(<TypographySection />);
		fireEvent.change(screen.getByLabelText(sizeLabel(CODE_SIZE_LABEL)), {
			target: { value: "99" },
		});
		expect(root(FONT_VARIABLE.codeSize)).toBe(`${CODE_FONT_SIZE_MAX}px`);
	});

	test("a misspelt family is refused: the root and the blob keep the face in force", () => {
		render(<TypographySection />);
		choose(CODE_FAMILY_LABEL, "No Such Face");
		expect(screen.getByText(FACE_REFUSED_TEXT("No Such Face"))).toBeDefined();
		expect(screen.getByLabelText(CODE_FAMILY_LABEL).getAttribute("aria-invalid")).toBe("true");
		expect(root(FONT_VARIABLE.codeFamily)).toBe(`"${DEFAULT_CODE_FONT_FAMILY}"`);
		expect(root(FONT_VARIABLE.codeFamily)).not.toContain(BUNDLED_CODE_FONT_FAMILY);
		expect(storage.entries()[SETTINGS_STORAGE_KEY]).toBeUndefined();
		expect(screen.getByText(TYPOGRAPHY_FALLBACK_NOTE)).toBeDefined();
	});

	test("the cask's alias reaches the root and the blob as the canonical family", () => {
		render(<TypographySection />);
		choose(CODE_FAMILY_LABEL, "GeistMono NFM");
		expect(root(FONT_VARIABLE.codeFamily)).toBe('"GeistMono Nerd Font Mono"');
		expect(storedFonts()).toEqual({
			ui: { family: DEFAULT_UI_FONT_FAMILY, size: DEFAULT_UI_FONT_SIZE },
			code: { family: "GeistMono Nerd Font Mono", size: DEFAULT_CODE_FONT_SIZE },
		});
	});

	test("reset returns both roles to the shipped defaults", () => {
		render(<TypographySection />);
		choose(UI_FAMILY_LABEL, CSS_GENERIC_FACE.systemUi);
		fireEvent.click(screen.getByText(TYPOGRAPHY_RESET_TEXT));
		expect(root(FONT_VARIABLE.uiFamily)).toBe(DEFAULT_UI_FONT_FAMILY);
		expect(root(FONT_VARIABLE.codeFamily)).toBe(`"${DEFAULT_CODE_FONT_FAMILY}"`);
		expect(storedFonts()).toEqual(DEFAULT_FONTS);
		expect((screen.getByLabelText(UI_FAMILY_LABEL) as HTMLInputElement).value).toBe(
			DEFAULT_UI_FONT_FAMILY,
		);
	});
});
