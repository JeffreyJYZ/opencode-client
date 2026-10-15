import { useEffect } from "react";
import { App } from "@/app/App";
import { installAppKeys } from "@/app/keymap";
import { installTabKeyboard } from "@/app/tabKeys";
import {
	closeActiveTabAndGo,
	openSettingsAndGo,
	requestCommandPalette,
	requestNewSession,
	switchTabAndGo,
	useTabRouteSync,
} from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import { CommandPalette } from "@/components/CommandPalette";
import { SessionPicker } from "@/components/SessionPicker";
import { TopNav } from "@/components/TopNav";
import { NewSessionFlow } from "@/pages/NewSessionFlow";

/**
 * The shell: the top nav above the route switch (spec 010 §Top nav, §Routes).
 *
 * Owns the subscriptions the switch itself must not know: route → tabs, the
 * strip's keys (`tabKeys.ts`) and the map's window chords — ⌘K and ⌘, — which
 * `keymap.ts` matches from the registry.
 *
 * The three built-in overlays — the new-session flow, the session picker `⌕`
 * (M1.4) and the command palette (M1.6) — mount here rather than in a slot: they
 * are core nav behaviour that must exist with every plugin disabled, and each
 * owns a window-level focus trap, not a plugin's contribution lifetime (spec 040
 * §Slots).
 */

export function Shell() {
	useTabRouteSync();
	useEffect(() => {
		return installTabKeyboard(getTabCount, {
			onNewSession: requestNewSession,
			onCloseActive: closeActiveTabAndGo,
			onSwitchTab: switchTabAndGo,
		});
	}, []);
	useEffect(() => {
		return installAppKeys({
			onCommandPalette: requestCommandPalette,
			onSettings: openSettingsAndGo,
		});
	}, []);
	return (
		<>
			<TopNav />
			<App />
			<NewSessionFlow />
			<SessionPicker />
			<CommandPalette />
		</>
	);
}

function getTabCount(): number {
	return getTabSnapshot().tabs.length;
}
