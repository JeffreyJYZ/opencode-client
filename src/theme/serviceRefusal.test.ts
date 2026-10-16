import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	BUILTIN_THEME,
	FOLLOW_SYSTEM_THEME_ID,
	THEME_MODE,
	THEME_PROTECTED_VARIABLE_PREFIX,
	type Theme,
} from "@/constants/theme";
import { clearFaults, FAULT_REASONS } from "@/plugins/faults";
import { marker, PROOF_THEME, styles, themeFaults } from "@/test/theme";
import {
	activeTheme,
	applyTheme,
	listThemes,
	registerTheme,
	resetThemeService,
} from "@/theme/service";

/**
 * The theme service's refusal path (M3.4): a theme that cannot be applied leaves
 * the app usable — inert plus a recorded fault, never a broken window. The same
 * rule spec 040 gives the plugin host, which is why it is built here rather than
 * arriving with M4.
 */

const handles: Array<{ dispose: () => void }> = [];

beforeEach(() => {
	clearFaults();
	resetThemeService();
});

afterEach(() => {
	for (const handle of handles.splice(0)) handle.dispose();
	resetThemeService();
	clearFaults();
});

describe("a theme that fails to apply", () => {
	test("an unknown id changes nothing on screen and is recorded", () => {
		applyTheme(BUILTIN_THEME.light.id);
		expect(applyTheme("nope")).toBe(false);
		expect(marker()).toBe(THEME_MODE.light);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.light.id);
		expect(themeFaults()).toHaveLength(1);
		expect(themeFaults()[0]?.reason).toBe(FAULT_REASONS.invalidTheme);
		expect(themeFaults()[0]?.subject).toBe("nope");
	});

	test("a malformed theme is refused, never thrown, and never listed", () => {
		const malformed = [
			{ ...PROOF_THEME, id: "  " },
			{ ...PROOF_THEME, id: BUILTIN_THEME.dark.id },
			{ ...PROOF_THEME, id: FOLLOW_SYSTEM_THEME_ID },
			{ ...PROOF_THEME, name: "" },
			{ ...PROOF_THEME, mode: "midnight" },
			{ ...PROOF_THEME, variables: ["--oc-surface"] },
			{ ...PROOF_THEME, variables: { "oc-surface": "#123456" } },
			{ ...PROOF_THEME, variables: { "--oc-surface": "" } },
			{ ...PROOF_THEME, css: "body { color: red }</style><script>1</script>" },
			{ ...PROOF_THEME, css: 42 },
		] as unknown as Theme[];
		for (const theme of malformed) {
			handles.push(registerTheme(theme));
			expect(themeFaults().at(-1)?.reason).toBe(FAULT_REASONS.invalidTheme);
		}
		expect(themeFaults()).toHaveLength(malformed.length);
		expect(listThemes().some((theme) => theme.id === PROOF_THEME.id)).toBe(false);
	});

	test("a refused registration leaves the theme already in force exactly as it was", () => {
		applyTheme(BUILTIN_THEME.light.id);
		const before = styles();
		registerTheme({ ...PROOF_THEME, variables: { "--oc-surface": 42 } } as unknown as Theme);
		expect(marker()).toBe(THEME_MODE.light);
		expect(styles()).toBe(before);
	});
});

describe("the user's typography wins over a theme's font claims", () => {
	test("a font variable is dropped before it reaches the DOM, and recorded", () => {
		const handle = registerTheme({
			...PROOF_THEME,
			variables: {
				"--oc-surface": "#123456",
				"--oc-font-ui": "Times New Roman, serif",
				"--oc-font-code-size": "40px",
			},
		});
		handles.push(handle);
		applyTheme(PROOF_THEME.id);
		expect(styles()).toContain("--oc-surface: #123456;");
		expect(styles()).not.toContain(THEME_PROTECTED_VARIABLE_PREFIX);
		expect(styles()).not.toContain("Times New Roman");
		const dropped = themeFaults();
		expect(dropped).toHaveLength(2);
		expect(dropped.every((fault) => fault.reason === FAULT_REASONS.protectedVariable)).toBe(
			true,
		);
		expect(dropped.map((fault) => fault.message).join(" ")).toContain("--oc-font-ui");
	});

	test("a theme whose only variables are font claims applies with no effect", () => {
		const handle = registerTheme({
			...PROOF_THEME,
			variables: { "--oc-font-ui": "serif" },
		});
		handles.push(handle);
		expect(applyTheme(PROOF_THEME.id)).toBe(true);
		expect(styles()).not.toContain(":root");
		expect(styles()).not.toContain("--oc-font");
		expect(marker()).toBe(THEME_MODE.light);
	});
});
