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
import { TopNav } from "@/components/TopNav";

/**
 * The shell: the top nav above the route switch (spec 010 §Top nav, §Routes).
 *
 * Owns the two subscriptions the switch itself must not know: route → tabs,
 * and the strip's keys. Tab clicks and closes navigate where they act, so the
 * sync never loops against history.
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
		</>
	);
}

function getTabCount(): number {
	return getTabSnapshot().tabs.length;
}
