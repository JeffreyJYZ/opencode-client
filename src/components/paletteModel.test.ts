import { describe, expect, test } from "bun:test";
import type { SettingsSection } from "@/app/settings/sections";
import { sessionTab, settingsTab } from "@/app/tabModel";
import { buildEntries, entryMatches, filterEntries } from "@/components/paletteModel";
import { chordLabel } from "@/constants/chords";
import { SHORTCUT_SETTINGS } from "@/constants/keys";
import { PALETTE_KIND, PALETTE_KIND_LABEL } from "@/constants/palette";
import { SETTINGS_TAB_LABEL } from "@/constants/tabs";
import type { SessionRow } from "@/session/useSessions";
import { pickerRow } from "@/test/picker";

const SECTION: SettingsSection = { id: "connect", label: "Server", component: () => null };

function row(id: string, title: string, directory: string): SessionRow {
	return pickerRow(id, title, directory) as unknown as SessionRow;
}

const SOURCES = {
	tabs: [sessionTab("ses_1")],
	sessions: [row("ses_1", "Alpha", "/dev/a"), row("ses_2", "Beta", "/dev/b")],
	commands: [{ name: "commit", description: "Commit changes" }],
	pluginCommands: [],
	sections: [SECTION],
};

describe("the palette model", () => {
	test("each of the four sources contributes a row, in source order", () => {
		const entries = buildEntries(SOURCES);
		expect(entries.map((entry) => entry.kind)).toEqual([
			PALETTE_KIND.settings,
			PALETTE_KIND.tab,
			PALETTE_KIND.session,
			PALETTE_KIND.session,
			PALETTE_KIND.command,
		]);
		expect(entries.map((entry) => entry.ref)).toEqual([
			"connect",
			"ses_1",
			"ses_1",
			"ses_2",
			"commit",
		]);
	});

	test("settings rows are built from the registry, and carry the settings chord", () => {
		const entries = buildEntries({
			...SOURCES,
			// M3.5 registering a new section must show up here without a change.
			sections: [SECTION, { id: "typography", label: "Typography", component: () => null }],
		});
		expect(entries.slice(0, 2).map((entry) => entry.label)).toEqual(["Server", "Typography"]);
		expect(entries[0].chord).toBe(SHORTCUT_SETTINGS.label);
	});

	test("a tab row uses the strip's own title", () => {
		const entries = buildEntries({ ...SOURCES, tabs: [settingsTab()] });
		expect(entries[1].label).toBe(SETTINGS_TAB_LABEL);
	});

	test("a plugin command is a command row, kept apart from a server command of the same name", () => {
		const entries = buildEntries({
			...SOURCES,
			commands: [{ name: "export", description: "server export" }],
			pluginCommands: [
				{
					id: "session-export.export",
					title: "Session: export transcript",
					run: () => {},
					// A real chord label, the one wire format `parseChordLabel` reads.
					keybinding: chordLabel("E"),
				},
			],
		});
		expect(entries.find((entry) => entry.id.startsWith("plugin:"))).toMatchObject({
			kind: PALETTE_KIND.command,
			label: "Session: export transcript",
			detail: PALETTE_KIND_LABEL.command,
			chord: chordLabel("E"),
			ref: "session-export.export",
		});
		// The server's own command is a second row, not replaced by the plugin's.
		expect(entries.some((entry) => entry.ref === "export")).toBe(true);
	});

	test("filtering matches the label and the detail a row shows", () => {
		const entries = buildEntries(SOURCES);
		expect(filterEntries(entries, "beta").map((entry) => entry.ref)).toEqual(["ses_2"]);
		expect(filterEntries(entries, "commit").map((entry) => entry.ref)).toEqual(["commit"]);
		expect(filterEntries(entries, "/commit").map((entry) => entry.ref)).toEqual(["commit"]);
		expect(filterEntries(entries, "zzz")).toEqual([]);
		expect(filterEntries(entries, "  ")).toHaveLength(entries.length);
		expect(entryMatches(entries[0], "SERVER")).toBe(true);
	});
});
