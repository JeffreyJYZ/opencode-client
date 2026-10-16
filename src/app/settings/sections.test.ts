import { afterEach, describe, expect, test } from "bun:test";
import {
	getSettingsSections,
	registerSettingsSection,
	resetSettingsSections,
	type SettingsSection,
	subscribeToSettingsSections,
} from "@/app/settings/sections";
import { APPEARANCE_TITLE } from "@/constants/appearance";
import { CONNECT_TITLE } from "@/constants/connect";
import { PLUGINS_TITLE } from "@/constants/plugins";
import { REFERENCE_TITLE } from "@/constants/reference";
import { SETTINGS_SECTION_ID } from "@/constants/settings";
import { TYPOGRAPHY_TITLE } from "@/constants/typography";
import { VERSION_SECTION_LABEL } from "@/constants/version";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";

function Probe() {
	return null;
}

/** The built-ins, in the order the row lists them (M3.5). */
const BUILTIN_IDS = [
	SETTINGS_SECTION_ID.appearance,
	SETTINGS_SECTION_ID.typography,
	SETTINGS_SECTION_ID.connect,
	SETTINGS_SECTION_ID.plugins,
	SETTINGS_SECTION_ID.reference,
	SETTINGS_SECTION_ID.version,
];

afterEach(() => {
	resetSettingsSections();
	clearFaults();
});

describe("the settings-section registry", () => {
	test("the built-in sections are present with their labels, in the row's order", () => {
		const sections = getSettingsSections();
		expect(sections.map((section) => section.id)).toEqual(BUILTIN_IDS);
		expect(sections.map((section) => section.label)).toEqual([
			APPEARANCE_TITLE,
			TYPOGRAPHY_TITLE,
			CONNECT_TITLE,
			PLUGINS_TITLE,
			REFERENCE_TITLE,
			VERSION_SECTION_LABEL,
		]);
	});

	test("a section can register, sorts by order, and disposes", () => {
		const dispose = registerSettingsSection({
			id: "probe-section",
			label: "Probe",
			component: Probe,
			order: -1,
		});
		expect(getSettingsSections().map((section) => section.id)).toEqual([
			"probe-section",
			...BUILTIN_IDS,
		]);
		dispose();
		expect(getSettingsSections().map((section) => section.id)).toEqual(BUILTIN_IDS);
	});

	test("reset drops a test's section and restores the built-ins", () => {
		registerSettingsSection({ id: "probe-plugins", label: "X", component: Probe });
		resetSettingsSections();
		expect(getSettingsSections().map((section) => section.id)).toEqual(BUILTIN_IDS);
	});

	test("the snapshot identity is stable and subscribers are told", () => {
		let notified = 0;
		const unsubscribe = subscribeToSettingsSections(() => {
			notified++;
		});
		expect(getSettingsSections()).toBe(getSettingsSections());
		const before = getSettingsSections();
		const dispose = registerSettingsSection({ id: "probe-x", label: "X", component: Probe });
		expect(notified).toBe(1);
		expect(getSettingsSections()).not.toBe(before);
		unsubscribe();
		dispose();
	});

	test("a malformed section is refused and faulted, never listed", () => {
		// An id with no name is the "unknown id" case: nothing is registered, and
		// the surface is left rendering the sections it already had.
		const dispose = registerSettingsSection({
			id: "   ",
			label: "Nameless",
			component: Probe,
		});
		dispose();
		expect(getSettingsSections().map((section) => section.id)).toEqual(BUILTIN_IDS);
		const faults = listFaults().filter((fault) => fault.area === FAULT_AREAS.settings);
		expect(faults).toHaveLength(1);
		expect(faults[0].reason).toBe(FAULT_REASONS.malformedEntry);
		expect(faults[0].message).toContain("an empty id");
	});

	test("a section with no component is refused and faulted", () => {
		registerSettingsSection({
			id: "probe-no-component",
			label: "Probe",
			component: null as unknown as SettingsSection["component"],
		});
		expect(getSettingsSections().map((section) => section.id)).toEqual(BUILTIN_IDS);
		const faults = listFaults().filter((fault) => fault.area === FAULT_AREAS.settings);
		expect(faults[0].reason).toBe(FAULT_REASONS.malformedEntry);
		expect(faults[0].subject).toBe("probe-no-component");
	});

	test("a disposed handle never removes a section registered after it", () => {
		const first = registerSettingsSection({ id: "probe-swap", label: "One", component: Probe });
		registerSettingsSection({ id: "probe-swap", label: "Two", component: Probe });
		first();
		expect(getSettingsSections().find((section) => section.id === "probe-swap")?.label).toBe(
			"Two",
		);
	});
});
