import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandPaletteDialog } from "@/components/CommandPaletteDialog";
import { activateEntry } from "@/components/paletteActivate";
import { filterEntries, type PaletteEntry } from "@/components/paletteModel";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import { usePaletteData } from "@/components/usePaletteData";
import { PICKER_SEARCH_DEBOUNCE_MS } from "@/constants/picker";
import { SESSION_PAGE_LIMIT } from "@/constants/sessions";
import { COMMAND_PALETTE_EVENT, NEW_SESSION_EVENT, SESSION_PICKER_EVENT } from "@/constants/tabs";

/**
 * The command palette (spec 010 §Desktop behaviours): ⌘K opens a list of the four
 * sources — settings sections, open tabs, sessions, commands (the server's
 * `command.list` **and** the host's `commands.register` registry, M4.11) —
 * filtered as you type, ↑/↓ with no wrap, Enter activates and closes, Escape and a
 * click outside close, and focus returns to the opener.
 *
 * One overlay at a time with the picker and the new-session flow (named window
 * signals), so two dialogs never own `Escape`. Its data path is `usePaletteData`,
 * which fetches only while the palette is open.
 */

export type CommandPaletteProps = {
	/** The session page size; production leaves it at the default. */
	readonly pageSize?: number;
};

export function CommandPalette({ pageSize = SESSION_PAGE_LIMIT }: CommandPaletteProps) {
	const [open, setOpen] = useState(false);
	const { entries, canLoadMore, loadMore } = usePaletteData(open, pageSize);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const openRef = useRef(false);

	useFocusTrap(dialogRef, open);
	useMenuDismiss(open, setOpen, dialogRef);

	const matches = filterEntries(entries, query);

	const openPalette = useCallback(() => {
		const opener = document.activeElement;
		openerRef.current = opener instanceof HTMLElement ? opener : null;
		setQuery("");
		setActive(0);
		setOpen(true);
	}, []);

	// Its own signal toggles; the other two overlays' signals dismiss it.
	useEffect(() => {
		openRef.current = open;
	}, [open]);
	useEffect(() => {
		const toggle = () => {
			if (openRef.current) setOpen(false);
			else openPalette();
		};
		const close = () => setOpen(false);
		window.addEventListener(COMMAND_PALETTE_EVENT, toggle);
		window.addEventListener(NEW_SESSION_EVENT, close);
		window.addEventListener(SESSION_PICKER_EVENT, close);
		return () => {
			window.removeEventListener(COMMAND_PALETTE_EVENT, toggle);
			window.removeEventListener(NEW_SESSION_EVENT, close);
			window.removeEventListener(SESSION_PICKER_EVENT, close);
		};
	}, [openPalette]);

	// Focus the field while open; hand focus back to whoever opened the palette.
	useEffect(() => {
		if (open) dialogRef.current?.querySelector("input")?.focus();
		else openerRef.current?.focus();
	}, [open]);

	// Keep the highlight inside the matches as the list grows or shrinks.
	useEffect(() => {
		setActive((index) => Math.max(0, Math.min(index, matches.length - 1)));
	}, [matches.length]);

	// A query with no match in the loaded page pulls the next one, until a match
	// appears or the list ends — the picker's own gesture (spec 050 §Sessions).
	useEffect(() => {
		if (!open || query.trim() === "" || matches.length > 0 || !canLoadMore) return;
		const timer = window.setTimeout(loadMore, PICKER_SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [open, query, matches.length, canLoadMore, loadMore]);

	const run = useCallback((entry: PaletteEntry) => {
		activateEntry(entry);
		setOpen(false);
	}, []);

	const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive((index) =>
				matches.length === 0 ? 0 : Math.min(index + 1, matches.length - 1),
			);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((index) => Math.max(index - 1, 0));
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			const chosen = matches[active];
			if (chosen !== undefined) run(chosen);
		}
	};

	if (!open) return null;

	return (
		<CommandPaletteDialog
			query={query}
			active={active}
			entries={matches}
			dialogRef={dialogRef}
			onQuery={(value) => {
				setQuery(value);
				setActive(0);
			}}
			onKeyDown={onKeyDown}
			onPick={run}
			onHover={setActive}
		/>
	);
}
