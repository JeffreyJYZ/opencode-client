import {
	altChordLabel,
	chordLabel,
	KEY_ESCAPE_LABEL,
	KEY_MODIFIER,
	type KeyBinding,
	shiftChordLabel,
} from "@/constants/chords";
import { KEY_ACTION } from "@/constants/keyActions";

/**
 * The map rows a **surface** matches, rather than the shell's window keymap (spec
 * 010 §Desktop behaviours). `keys.ts` holds the window chords and the one registry
 * list; these five live here because the rows plus that list overran the 150-line
 * cap — the same seam `KEY_ACTION` took out of `keys.ts`, and `keys.ts` re-exports
 * every name, so no caller changed.
 *
 * What unites them is **who** matches the chord: the composer (⌘↩, `Esc`), a
 * surface's own region (⇧F10), the transcript's scroller (⌥↑/⌥↓) — never
 * `keymap.ts` or `tabKeys.ts`, which the shell installs on `window`.
 */

/**
 * ⌘↩: send the prompt (spec 010 §Desktop behaviours, spec 020 §Prompt box — both
 * readings in the report's error list). Matched by the **composer**.
 */
export const SHORTCUT_SEND: KeyBinding = {
	id: KEY_ACTION.sendPrompt,
	key: "Enter",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("↩"),
	description: "Send prompt",
};

/**
 * ⇧F10: open the focused surface's context menu — the platform's menu chord, chosen
 * over the dedicated `ContextMenu` key. Matched **locally** by each surface, like `⌘↩`.
 */
export const SHORTCUT_CONTEXT_MENU: KeyBinding = {
	id: KEY_ACTION.contextMenu,
	key: "F10",
	modifier: KEY_MODIFIER.shift,
	label: shiftChordLabel("F10"),
	description: "Open context menu",
};

/**
 * `Esc`: interrupt a running turn — the one `KEY_MODIFIER.none` row; the composer
 * matches it through the registry and acts only while a turn runs.
 */
export const SHORTCUT_INTERRUPT: KeyBinding = {
	id: KEY_ACTION.interrupt,
	key: "Escape",
	modifier: KEY_MODIFIER.none,
	label: KEY_ESCAPE_LABEL,
	description: "Interrupt a running turn",
};

/**
 * ⌥↑: jump to the user band above (spec 020 §Scroll: "`⌥↑` / `⌥↓` jump between user
 * bands"). Matched by the transcript, which owns the rows and the scroller.
 */
export const SHORTCUT_BAND_PREVIOUS: KeyBinding = {
	id: KEY_ACTION.bandPrevious,
	key: "ArrowUp",
	modifier: KEY_MODIFIER.alt,
	label: altChordLabel("↑"),
	description: "Previous user band",
};

/** ⌥↓: jump to the user band below — the same row's other direction. */
export const SHORTCUT_BAND_NEXT: KeyBinding = {
	id: KEY_ACTION.bandNext,
	key: "ArrowDown",
	modifier: KEY_MODIFIER.alt,
	label: altChordLabel("↓"),
	description: "Next user band",
};
