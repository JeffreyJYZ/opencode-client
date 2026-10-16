import { useEffect } from "react";
import { App } from "@/app/App";
import { installExternalLinks } from "@/app/externalLinks";
import { installAppKeys } from "@/app/keymap";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import { installTabKeyboard } from "@/app/tabKeys";
import {
	closeActiveTabAndGo,
	closeOtherActiveTabsAndGo,
	openSettingsAndGo,
	requestCommandPalette,
	requestNewSession,
	switchTabAndGo,
	useTabRouteSync,
} from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import { useTurnEndNotification } from "@/app/turnEndNotification";
import { CommandPalette } from "@/components/CommandPalette";
import { BannerHost } from "@/components/notify/BannerHost";
import { ModalHost } from "@/components/notify/ModalHost";
import { SessionPicker } from "@/components/SessionPicker";
import { Slot } from "@/components/Slot";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Statusline } from "@/components/statusline/Statusline";
import { TopNav } from "@/components/TopNav";
import { ToastHost } from "@/components/toast/ToastHost";
import { SLOT } from "@/constants/slots";
import { SHELL_BODY_STYLE, SHELL_MAIN_STYLE, SHELL_ROW_STYLE } from "@/constants/styles";
import { NewSessionFlow } from "@/pages/NewSessionFlow";

/**
 * The shell: the top nav above the route switch, with the session view's two
 * pieces of chrome around it — the sidebar (right) and the statusline (below) —
 * all inside one column whose pane row grows (spec 020 §Regions).
 *
 * Owns the subscriptions the switch itself must not know: route → tabs, the
 * strip's keys (`tabKeys.ts`) and the map's window chords — ⌘K, ⌘, and ⌘B — which
 * `keymap.ts` matches from the registry. ⌘B's action is the store's own toggle,
 * so the chord, a menu item and a palette entry would all flip the same state.
 *
 * The three built-in overlays — the new-session flow, the session picker `⌕`
 * (M1.4) and the command palette (M1.6) — mount here rather than in a slot: they
 * are core nav behaviour that must exist with every plugin disabled, and each
 * owns a window-level focus trap, not a plugin's contribution lifetime (spec 040
 * §Slots).
 */

export function Shell() {
	useTabRouteSync();
	// The shell's native integrations (M5.2): the external-link hand-off and the
	// unfocused turn-end notification. Both are inert without a shell to hand to.
	useTurnEndNotification();
	useEffect(() => installExternalLinks(), []);
	useEffect(() => {
		return installTabKeyboard(getTabCount, {
			onNewSession: requestNewSession,
			onCloseActive: closeActiveTabAndGo,
			onCloseOthers: closeOtherActiveTabsAndGo,
			onSwitchTab: switchTabAndGo,
		});
	}, []);
	useEffect(() => {
		return installAppKeys({
			onCommandPalette: requestCommandPalette,
			onSettings: openSettingsAndGo,
			onToggleSidebar: toggleSidebar,
		});
	}, []);
	return (
		<>
			{/* A plugin's persistent notices (M4.20): in the shell's own column, above
			    the nav, so a banner pushes the app down rather than covering it. */}
			<BannerHost />
			<TopNav />
			<div style={SHELL_BODY_STYLE}>
				<div style={SHELL_ROW_STYLE}>
					<div style={SHELL_MAIN_STYLE}>
						<App />
					</div>
					<Sidebar />
				</div>
				<Statusline />
			</div>
			<NewSessionFlow />
			<SessionPicker />
			<CommandPalette />
			{/* A plugin's window-level overlay (M4.12), beside the three built-ins —
			    not instead of them. An empty slot renders nothing. */}
			<Slot id={SLOT.overlays} />
			<ToastHost />
			{/* A plugin's modal and its `confirm` (M4.20), beside the toast stack. */}
			<ModalHost />
		</>
	);
}

function getTabCount(): number {
	return getTabSnapshot().tabs.length;
}
