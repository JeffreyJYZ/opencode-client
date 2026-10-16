import { matchesBinding } from "@/constants/chords";
import { SHORTCUT_INTERRUPT, SHORTCUT_SEND } from "@/constants/keys";

/**
 * The composer's keyboard rules, as data (M2.5, spec 010 §Desktop behaviours'
 * keyboard map, spec 020 §Prompt box). Pure and DOM-free on purpose: the four
 * orderings that matter — the menu before the box, the interrupt only while a turn
 * runs, ⌘↩ sends and ↩ is a newline — are unit-tested here, and the component only
 * performs the action this returns.
 *
 * The two chords come from the **registry** (`constants/keys.ts`), so they are
 * listed in the keymap help and the chord-uniqueness test covers them; this module
 * matches them with the same `matchesBinding` every other handler uses.
 */

export const COMPOSER_ACTION = {
	/** Send the prompt. */
	send: "send",
	/** Insert a newline (`↩` alone — the configurable half of the map). */
	newline: "newline",
	menuNext: "menu-next",
	menuPrev: "menu-prev",
	/** Accept the highlighted row: Enter or Tab while the menu is open. */
	menuAccept: "menu-accept",
	/** Close the menu and nothing else. */
	menuClose: "menu-close",
	/** Interrupt the running turn — only ever reachable while one runs. */
	interrupt: "interrupt",
	none: "none",
} as const;

export type ComposerAction = (typeof COMPOSER_ACTION)[keyof typeof COMPOSER_ACTION];

export type ComposerKeyInput = {
	readonly key: string;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly shiftKey: boolean;
	/** The menu is open: it owns the navigation keys, Enter, Tab and Escape. */
	readonly menuOpen: boolean;
	/** The store says a turn is running (`transcript.running`), never a local flag. */
	readonly running: boolean;
};

export function composerAction(event: ComposerKeyInput): ComposerAction {
	if (event.menuOpen) {
		if (event.key === "ArrowDown") return COMPOSER_ACTION.menuNext;
		if (event.key === "ArrowUp") return COMPOSER_ACTION.menuPrev;
		if (event.key === "Enter" || event.key === "Tab") return COMPOSER_ACTION.menuAccept;
		// Escape closes the menu and **only** the menu: never the box, never the turn.
		if (event.key === "Escape") return COMPOSER_ACTION.menuClose;
	}
	if (matchesBinding(event, SHORTCUT_SEND)) return COMPOSER_ACTION.send;
	if (event.key === "Enter" && !event.shiftKey) return COMPOSER_ACTION.newline;
	if (matchesBinding(event, SHORTCUT_INTERRUPT)) {
		return event.running ? COMPOSER_ACTION.interrupt : COMPOSER_ACTION.none;
	}
	return COMPOSER_ACTION.none;
}
