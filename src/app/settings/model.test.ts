import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, freshDocument, settingsFromDocument } from "@/app/settings/model";
import { RECENT_DIRECTORIES_LIMIT } from "@/constants/directories";
import {
	DEFAULT_CODE_FONT_FAMILY,
	DEFAULT_CODE_FONT_SIZE,
	DEFAULT_SIDEBAR,
	DEFAULT_UI_FONT_SIZE,
	SETTING_KEYS,
	SETTINGS_DATA_VERSION,
	SIDEBAR_MAX_WIDTH,
} from "@/constants/settings";

describe("settingsFromDocument — hostile or missing fields", () => {
	test("an empty document resolves to the defaults", () => {
		expect(settingsFromDocument({})).toEqual(DEFAULT_SETTINGS);
	});

	test("wrong types degrade one field each, never the whole document", () => {
		const settings = settingsFromDocument({
			fonts: [],
			lastOpened: ["ses_a"],
			lastRoute: 42,
			recentDirectories: "one",
			server: 7,
			sidebar: "wide",
			tabs: "ses_broken",
		});
		expect(settings).toEqual(DEFAULT_SETTINGS);
	});

	test("the stored server normalizes, and a url-less blob is no server", () => {
		expect(
			settingsFromDocument({
				[SETTING_KEYS.server]: { url: "  http://x:1 ", password: "pw" },
			}).server,
		).toEqual({ url: "http://x:1", password: "pw" });
		expect(
			settingsFromDocument({ [SETTING_KEYS.server]: { password: "pw" } }).server,
		).toBeNull();
		expect(DEFAULT_SETTINGS.server).toBeNull();
	});

	test("a font size outside the role's range is clamped, and a blank face is the default", () => {
		const settings = settingsFromDocument({
			[SETTING_KEYS.fonts]: {
				ui: { family: "   ", size: 500 },
				code: { family: "Fira Code", size: 1 },
			},
		});
		expect(settings.fonts.ui.family).toBe(DEFAULT_SETTINGS.fonts.ui.family);
		expect(settings.fonts.ui.size).toBe(20);
		expect(settings.fonts.code.family).toBe("Fira Code");
		expect(settings.fonts.code.size).toBe(11);
	});

	test("a missing font role is that role's default, not the other role's", () => {
		const settings = settingsFromDocument({
			[SETTING_KEYS.fonts]: { ui: { family: "Inter" } },
		});
		expect(settings.fonts.ui).toEqual({ family: "Inter", size: DEFAULT_UI_FONT_SIZE });
		expect(settings.fonts.code).toEqual({
			family: DEFAULT_CODE_FONT_FAMILY,
			size: DEFAULT_CODE_FONT_SIZE,
		});
	});

	test("the sidebar width clamps and a non-boolean visibility is the default", () => {
		const settings = settingsFromDocument({
			[SETTING_KEYS.sidebar]: { visible: "yes", width: 5000 },
		});
		expect(settings.sidebar).toEqual({
			visible: DEFAULT_SIDEBAR.visible,
			width: SIDEBAR_MAX_WIDTH,
		});
	});

	test("recent directories drop non-strings, dedupe and cap", () => {
		const many = Array.from(
			{ length: RECENT_DIRECTORIES_LIMIT + 4 },
			(_, index) => `/d${index}`,
		);
		const settings = settingsFromDocument({
			[SETTING_KEYS.recentDirectories]: ["/a", 7, "", "/a", null, ...many],
		});
		expect(settings.recentDirectories[0]).toBe("/a");
		expect(settings.recentDirectories.length).toBe(RECENT_DIRECTORIES_LIMIT);
	});

	test("a stored route that is not a path falls back to the landing route", () => {
		expect(settingsFromDocument({ [SETTING_KEYS.lastRoute]: "settings" }).lastRoute).toBe(
			DEFAULT_SETTINGS.lastRoute,
		);
		expect(settingsFromDocument({ [SETTING_KEYS.lastRoute]: "/settings" }).lastRoute).toBe(
			"/settings",
		);
	});

	test("the stored theme is a trimmed id or the built-in default (M3.4)", () => {
		expect(settingsFromDocument({}).theme).toBeNull();
		expect(settingsFromDocument({ [SETTING_KEYS.theme]: " gruvbox " }).theme).toBe("gruvbox");
		expect(settingsFromDocument({ [SETTING_KEYS.theme]: "" }).theme).toBeNull();
		expect(settingsFromDocument({ [SETTING_KEYS.theme]: 7 }).theme).toBeNull();
		expect(settingsFromDocument({ [SETTING_KEYS.theme]: { id: "gruvbox" } }).theme).toBeNull();
	});
});

describe("freshDocument", () => {
	test("carries the current version and the defaults", () => {
		const document = freshDocument();
		expect(document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_DATA_VERSION);
		expect(settingsFromDocument(document)).toEqual(DEFAULT_SETTINGS);
	});
});
