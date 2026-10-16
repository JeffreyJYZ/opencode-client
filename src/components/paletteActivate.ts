import { tabKey } from "@/app/tabModel";
import { activateTabAndGo, openSessionAndGo, openSettingsAndGo } from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import type { PaletteEntry } from "@/components/paletteModel";
import { COMMAND_RUN_EVENT, PALETTE_KIND } from "@/constants/palette";
import { getCommand, runCommand } from "@/plugins/commands";

/**
 * What activating a palette row does (spec 010 §Desktop behaviours), one branch
 * per kind: a tab, a session, the settings surface, or a command.
 *
 * A command row has **two providers** (M4.11): the server's `command.list` and
 * the host's `commands.register` registry. The row is the same kind, so the
 * branch tells them apart by the id it can run in-process — a registry hit runs
 * through `runCommand`, everything else emits `COMMAND_RUN_EVENT` for M2.5's
 * composer / M4.4's client commands to fill. Keeping the decision here leaves the
 * component with only the dialog's own state and keyboard.
 */
export function activateEntry(entry: PaletteEntry): void {
	if (entry.kind === PALETTE_KIND.tab) {
		const tab = getTabSnapshot().tabs.find((candidate) => tabKey(candidate) === entry.ref);
		if (tab !== undefined) activateTabAndGo(tab);
		return;
	}
	if (entry.kind === PALETTE_KIND.session) {
		openSessionAndGo(entry.ref);
		return;
	}
	if (entry.kind === PALETTE_KIND.settings) {
		openSettingsAndGo();
		return;
	}
	if (getCommand(entry.ref) !== undefined) {
		runCommand(entry.ref);
		return;
	}
	window.dispatchEvent(new CustomEvent(COMMAND_RUN_EVENT, { detail: { name: entry.ref } }));
}
