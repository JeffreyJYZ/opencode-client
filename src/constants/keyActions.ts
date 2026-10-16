/**
 * The action each chord names — the map's vocabulary (M1.6). It lives in its own
 * module because `chords.ts` is the chord **arithmetic** and this is data: two
 * branches' chords meeting in one merge pushed that file over the 150-line cap, and
 * this block was the part of it that was never arithmetic. `keys.ts` re-exports it,
 * so no caller changed.
 */
export const KEY_ACTION = {
	commandPalette: "command-palette",
	newSession: "new-session",
	closeTab: "close-tab",
	closeOtherTabs: "close-other-tabs",
	switchTab: "switch-tab",
	settings: "settings",
	toggleSidebar: "toggle-sidebar",
	sendPrompt: "send-prompt",
	interrupt: "interrupt",
	contextMenu: "context-menu",
	/** The transcript's band navigation (M2.23): `⌥↑` and `⌥↓`. */
	bandPrevious: "band-previous",
	bandNext: "band-next",
} as const;
