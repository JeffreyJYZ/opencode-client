import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import type { ComposerEntry } from "@/session/composerEntries";
import { COMPOSER_ACTION, composerAction } from "@/session/composerKeys";
import type { MenuToken } from "@/session/composerMenuModel";
import { moveIndex } from "@/session/composerMenuModel";

/**
 * The composer menu's state and its keys (M2.5, spec 020 §Prompt box).
 *
 * The order the keys are resolved in is the whole point, and it lives in the tested
 * `composerAction` rather than in a chain of `if`s here:
 *
 * - `↑`/`↓` move the highlight **and clamp** — no wrap, so the list cannot cycle;
 * - `Enter`/`Tab` accept the highlighted row; `Esc` closes **only** the menu;
 * - `Esc` with the menu closed reaches the interrupt, and only while the store's
 *   running flag is true; `⌘↩` sends, `↩` is a newline.
 */

export type ComposerMenuState = {
	readonly active: number;
	readonly onHover: (index: number) => void;
	/** The menu is on screen: a token is being typed, unless Esc dismissed it. */
	readonly visible: boolean;
	readonly onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
};

export type ComposerMenuOptions = {
	readonly token: MenuToken | null;
	readonly entries: readonly ComposerEntry[];
	readonly loadingCommands: boolean;
	readonly running: boolean;
	readonly onApply: (entry: ComposerEntry) => void;
	readonly onSend: () => void;
	readonly onInterrupt: () => void;
};

export function useComposerMenu(options: ComposerMenuOptions): ComposerMenuState {
	const { token, entries, running, onApply, onSend, onInterrupt } = options;
	const [active, setActive] = useState(0);
	const [dismissed, setDismissed] = useState(false);

	// A new token is a new menu: reopen it and start the highlight at the top. The
	// token's own key is the dependency (its text changes as you type).
	useEffect(() => {
		void token?.trigger;
		void token?.query;
		setDismissed(false);
		setActive(0);
	}, [token?.trigger, token?.query]);

	// A shrinking list must not leave the highlight past its end.
	useEffect(() => {
		setActive((index) => moveIndex(index, entries.length, 0));
	}, [entries.length]);

	const visible = token !== null && !dismissed;
	const menuOwnsKeys = visible && entries.length > 0;

	const onKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
			const action = composerAction({
				key: event.key,
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				shiftKey: event.shiftKey,
				menuOpen: menuOwnsKeys,
				running,
			});
			if (action === COMPOSER_ACTION.none || action === COMPOSER_ACTION.newline) return;
			event.preventDefault();
			if (action === COMPOSER_ACTION.send) return onSend();
			if (action === COMPOSER_ACTION.interrupt) return onInterrupt();
			if (action === COMPOSER_ACTION.menuClose) return setDismissed(true);
			if (action === COMPOSER_ACTION.menuAccept) {
				const entry = entries[active];
				if (entry !== undefined) onApply(entry);
				return;
			}
			const delta = action === COMPOSER_ACTION.menuNext ? 1 : -1;
			setActive((index) => moveIndex(index, entries.length, delta));
		},
		[active, entries, menuOwnsKeys, onApply, onInterrupt, onSend, running],
	);

	return { active, onHover: setActive, visible, onKeyDown };
}
