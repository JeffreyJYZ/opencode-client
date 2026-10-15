import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettingsSections } from "@/app/settings/sections";
import { tabKey } from "@/app/tabModel";
import { activateTabAndGo, openSessionAndGo, openSettingsAndGo } from "@/app/tabSync";
import { getTabSnapshot } from "@/app/tabs";
import { useTabs } from "@/app/useTabs";
import { CommandPaletteDialog } from "@/components/CommandPaletteDialog";
import { buildEntries, filterEntries, type PaletteEntry } from "@/components/paletteModel";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import { COMMAND_RUN_EVENT, PALETTE_KIND } from "@/constants/palette";
import { COMMAND_PALETTE_EVENT, NEW_SESSION_EVENT, SESSION_PICKER_EVENT } from "@/constants/tabs";
import { useCommands } from "@/session/useCommands";
import { useSessions } from "@/session/useSessions";

/**
 * The command palette (spec 010 §Desktop behaviours): ⌘K opens a list of the four
 * sources — settings sections, open tabs, sessions, `command.list` — filtered as
 * you type, ↑/↓ with no wrap, Enter activates and closes, Escape and a click
 * outside close, and focus returns to the opener.
 *
 * One overlay *at a time* with the picker and the new-session flow: each opens by
 * a window signal and closes on the others', so two dialogs never own `Escape`
 * together. The overlay, the focus trap and the dismissal are M1.4's, reused.
 */

export function CommandPalette() {
	const tabs = useTabs();
	const { sessions, reload: reloadSessions } = useSessions();
	const { commands, reload: reloadCommands } = useCommands();
	const sections = useSettingsSections();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const openRef = useRef(false);

	useFocusTrap(dialogRef, open);
	useMenuDismiss(open, setOpen, dialogRef);

	const entries = useMemo(
		() => buildEntries({ tabs: tabs.tabs, sessions, commands, sections }),
		[tabs, sessions, commands, sections],
	);
	const matches = filterEntries(entries, query);

	const openPalette = useCallback(() => {
		const opener = document.activeElement;
		openerRef.current = opener instanceof HTMLElement ? opener : null;
		// Refetch on open: a session or command created since the last open would
		// otherwise stay invisible, and `command.list` loads asynchronously.
		reloadSessions();
		reloadCommands();
		setQuery("");
		setActive(0);
		setOpen(true);
	}, [reloadSessions, reloadCommands]);

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

	const run = useCallback((entry: PaletteEntry) => {
		if (entry.kind === PALETTE_KIND.tab) {
			const tab = getTabSnapshot().tabs.find((candidate) => tabKey(candidate) === entry.ref);
			if (tab !== undefined) activateTabAndGo(tab);
		} else if (entry.kind === PALETTE_KIND.session) {
			openSessionAndGo(entry.ref);
		} else if (entry.kind === PALETTE_KIND.settings) {
			openSettingsAndGo();
		} else {
			// A command's runner is M2.5's composer / M4.4's client commands; M1.6
			// lists the row and names the signal, never a dead key.
			window.dispatchEvent(
				new CustomEvent(COMMAND_RUN_EVENT, { detail: { name: entry.ref } }),
			);
		}
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
