import { afterEach, describe, expect, test } from "bun:test";
import {
	getSettingsSections,
	registerSettingsSection,
	resetSettingsSections,
	subscribeToSettingsSections,
} from "@/app/settings/sections";
import { CONNECT_TITLE } from "@/constants/connect";
import { SETTINGS_SECTION_ID } from "@/constants/settings";

function Probe() {
	return null;
}

afterEach(() => {
	resetSettingsSections();
});

describe("the settings-section registry", () => {
	test("the built-in section is present with its label", () => {
		const sections = getSettingsSections();
		expect(sections.map((section) => section.id)).toEqual([
			SETTINGS_SECTION_ID.connect,
			SETTINGS_SECTION_ID.version,
		]);
		expect(sections[0].label).toBe(CONNECT_TITLE);
	});

	test("a section can register, sorts by order, and disposes", () => {
		const dispose = registerSettingsSection({
			id: "appearance",
			label: "Appearance",
			component: Probe,
			order: -1,
		});
		expect(getSettingsSections().map((section) => section.id)).toEqual([
			"appearance",
			SETTINGS_SECTION_ID.connect,
			SETTINGS_SECTION_ID.version,
		]);
		dispose();
		expect(getSettingsSections().map((section) => section.id)).toEqual([
			SETTINGS_SECTION_ID.connect,
			SETTINGS_SECTION_ID.version,
		]);
	});

	test("reset drops a test's section and restores the built-ins", () => {
		registerSettingsSection({ id: "typography", label: "Typography", component: Probe });
		resetSettingsSections();
		expect(getSettingsSections().map((section) => section.id)).toEqual([
			SETTINGS_SECTION_ID.connect,
			SETTINGS_SECTION_ID.version,
		]);
	});

	test("the snapshot identity is stable and subscribers are told", () => {
		let notified = 0;
		const unsubscribe = subscribeToSettingsSections(() => {
			notified++;
		});
		expect(getSettingsSections()).toBe(getSettingsSections());
		const before = getSettingsSections();
		const dispose = registerSettingsSection({ id: "x", label: "X", component: Probe });
		expect(notified).toBe(1);
		expect(getSettingsSections()).not.toBe(before);
		unsubscribe();
		dispose();
	});
});
