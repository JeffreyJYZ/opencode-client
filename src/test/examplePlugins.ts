import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSettingsSections } from "@/app/settings/sections";
import { listCommands } from "@/plugins/commands";
import { listPanels } from "@/plugins/panels";
import { getSlotContributions } from "@/plugins/registry";
import { listThemes } from "@/theme/service";

/**
 * The four example plugins' contract, as the test fixture (M4.7, spec 040 §Plugins
 * shipped as examples): what each one claims to contribute, the labels each
 * manifest declares, and the readers that count a contribution back out of the
 * registry the code declares.
 *
 * The counts are deliberately **not** the plugin's own word: `counts()` reads the
 * slot, command, panel, theme and settings registries, so an example that
 * registers nothing fails here even though its source says it does.
 */

export const EXAMPLES = [
	"hello-world",
	"theme-gruvbox",
	"session-export",
	"context-meter",
] as const;

export type Example = (typeof EXAMPLES)[number];

export type Expected = {
	readonly slot: readonly string[];
	readonly command: readonly string[];
	readonly panel: readonly string[];
	readonly theme: readonly string[];
	readonly section: readonly string[];
	/** The manifest's `capabilities` — each example declares only what it uses. */
	readonly capabilities: readonly string[];
};

export const EXPECTED: Record<Example, Expected> = {
	"hello-world": {
		slot: ["hello-world.greeting"],
		command: ["hello-world.greet"],
		panel: [],
		theme: [],
		section: [],
		capabilities: ["window"],
	},
	"theme-gruvbox": {
		slot: [],
		command: [],
		panel: [],
		theme: ["gruvbox-dark"],
		section: ["theme-gruvbox.section"],
		capabilities: ["plugin-data"],
	},
	"session-export": {
		slot: [],
		command: ["session-export.export"],
		panel: [],
		theme: [],
		section: ["session-export.section"],
		capabilities: ["plugin-data"],
	},
	"context-meter": {
		slot: [],
		command: [],
		panel: ["context-meter.panel"],
		theme: [],
		section: [],
		capabilities: [],
	},
};

/** The five registries an example contributes to, as their own live counts. */
export type Counts = {
	readonly slot: readonly string[];
	readonly command: readonly string[];
	readonly panel: readonly string[];
	readonly theme: readonly string[];
	readonly section: readonly string[];
};

export function counts(): Counts {
	return {
		slot: getSlotContributions("home.hero").map((entry) => entry.id),
		command: listCommands().map((entry) => entry.id),
		panel: listPanels().map((entry) => entry.id),
		theme: listThemes().map((entry) => entry.id),
		section: getSettingsSections().map((entry) => entry.id),
	};
}

/** The ids `after` has that `before` did not — what one activation added. */
export function contributionDelta(before: Counts, after: Counts): Counts {
	const added = (from: readonly string[], to: readonly string[]): string[] =>
		to.filter((one) => !from.includes(one));
	return {
		slot: added(before.slot, after.slot),
		command: added(before.command, after.command),
		panel: added(before.panel, after.panel),
		theme: added(before.theme, after.theme),
		section: added(before.section, after.section),
	};
}

/** No contribution at all — the delta of an install, or of a clean teardown. */
export const NOTHING: Counts = { slot: [], command: [], panel: [], theme: [], section: [] };

export function manifestOf(id: Example): Record<string, unknown> {
	return JSON.parse(
		readFileSync(join(process.cwd(), "plugins", id, "plugin.json"), "utf8"),
	) as Record<string, unknown>;
}

/** The built entry `scripts/build-plugins.ts` wrote for `id`. */
export function builtSource(id: Example): string {
	return readFileSync(join(process.cwd(), "public/plugins", id, "main.js"), "utf8");
}
