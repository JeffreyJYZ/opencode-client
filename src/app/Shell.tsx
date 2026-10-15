import { useEffect } from "react";
import { App } from "@/app/App";
import { installTabKeyboard } from "@/app/tabKeys";
import {
	closeActiveTabAndGo,
	requestNewSession,
	switchTabAndGo,
	useTabRouteSync,
} from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import { SessionPicker } from "@/components/SessionPicker";
import { TopNav } from "@/components/TopNav";
import { NewSessionFlow } from "@/pages/NewSessionFlow";

/**
 * The shell: the top nav above the route switch (spec 010 §Top nav, §Routes).
 *
 * Owns the two subscriptions the switch itself must not know: route → tabs,
 * and the strip's keys. Tab clicks and closes navigate where they act, so the
 * sync never loops against history.
 *
 * The two built-in overlays — the new-session flow and the session picker `⌕`
 * (M1.4) — mount here rather than in a slot: they are core nav behaviour that
 * must exist with every plugin disabled, and the picker owns a window-level
 * focus trap, not a plugin's contribution lifetime (spec 040 §Slots).
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
	return (
		<>
			<TopNav />
			<App />
			<NewSessionFlow />
			<SessionPicker />
		</>
	);
}

function getTabCount(): number {
	return getTabSnapshot().tabs.length;
}
