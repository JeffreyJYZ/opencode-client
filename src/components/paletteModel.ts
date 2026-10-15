import type { SettingsSection } from "@/app/settings/sections";
import { type Tab, tabKey } from "@/app/tabModel";
import { tabTitle } from "@/components/Tab";
import { SHORTCUT_SETTINGS } from "@/constants/keys";
import { PALETTE_KIND, PALETTE_KIND_LABEL, type PaletteKind } from "@/constants/palette";
import { lastPathSegment, sessionTitle } from "@/pages/homeModel";
import type { CommandRow } from "@/session/useCommands";
import type { SessionRow } from "@/session/useSessions";

/**
 * The palette's pure model (spec 010 §Desktop behaviours): four sources → one flat
 * list, filtered by what a row *shows*. No DOM, so the four-source rule, the
 * filtering and the id/ref a row acts on are unit-testable without a browser.
 *
 * The settings rows are built from the **section registry**, never a hardcoded
 * list (requirement 4); a section added in M3.5 appears here without a change.
 */

/** One palette row. `ref` is the id the controller acts on for `kind`. */
export type PaletteEntry = {
	readonly id: string;
	readonly kind: PaletteKind;
	readonly label: string;
	readonly detail: string;
	/** The chord shown beside the row, when the registry declares one. */
	readonly chord?: string;
	readonly ref: string;
};

/** The four sources the palette lists. */
export type PaletteSources = {
	readonly tabs: readonly Tab[];
	readonly sessions: readonly SessionRow[];
	readonly commands: readonly CommandRow[];
	readonly sections: readonly SettingsSection[];
};

/**
 * The order sources are listed in: what the user is *in* (settings, open tabs),
 * then what exists (sessions, commands). Only the session/settings rows carry a
 * runnable path today; a command row carries the `command.list` name.
 */
export function buildEntries(sources: PaletteSources): PaletteEntry[] {
	const entries: PaletteEntry[] = [];
	for (const section of sources.sections) {
		entries.push({
			id: `settings:${section.id}`,
			kind: PALETTE_KIND.settings,
			label: section.label,
			detail: PALETTE_KIND_LABEL.settings,
			chord: SHORTCUT_SETTINGS.label,
			ref: section.id,
		});
	}
	for (const tab of sources.tabs) {
		entries.push({
			id: `tab:${tabKey(tab)}`,
			kind: PALETTE_KIND.tab,
			label: tabTitle(tab),
			detail: PALETTE_KIND_LABEL.tab,
			ref: tabKey(tab),
		});
	}
	for (const session of sources.sessions) {
		entries.push({
			id: `session:${session.id}`,
			kind: PALETTE_KIND.session,
			label: sessionTitle(session),
			detail: `${PALETTE_KIND_LABEL.session} · ${lastPathSegment(session.location.directory)}`,
			ref: session.id,
		});
	}
	for (const command of sources.commands) {
		const description = command.description?.trim();
		entries.push({
			id: `command:${command.name}`,
			kind: PALETTE_KIND.command,
			label: description === undefined || description === "" ? command.name : description,
			detail: `/${command.name}`,
			ref: command.name,
		});
	}
	return entries;
}

/** Whether a row matches: a blank query keeps every row. */
export function entryMatches(entry: PaletteEntry, query: string): boolean {
	const term = query.trim().toLowerCase();
	if (term === "") return true;
	return `${entry.label}\n${entry.detail}`.toLowerCase().includes(term);
}

/** The rows a query keeps, in source order. */
export function filterEntries(entries: readonly PaletteEntry[], query: string): PaletteEntry[] {
	if (query.trim() === "") return [...entries];
	return entries.filter((entry) => entryMatches(entry, query));
}
