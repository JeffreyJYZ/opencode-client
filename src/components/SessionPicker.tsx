import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { setLastOpenedSession } from "@/app/lastOpened";
import { activateTabAndGo } from "@/app/tabSync";
import { openTab } from "@/app/tabs";
import { filterSessions } from "@/components/pickerModel";
import { SessionPickerDialog } from "@/components/SessionPickerDialog";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import { PICKER_SEARCH_DEBOUNCE_MS } from "@/constants/picker";
import { SESSION_PAGE_LIMIT } from "@/constants/sessions";
import { NEW_SESSION_EVENT, SESSION_PICKER_EVENT, TAB_KIND } from "@/constants/tabs";
import { useClient } from "@/session/ClientProvider";
import { useSessionPages } from "@/session/useSessionPages";

/**
 * The session picker `⌕` (spec 010 §Top nav: *all root sessions, searchable*;
 * §Desktop behaviours). It listens for the `oc:session-picker` event the `⌕`
 * control dispatches, lists root sessions newest first, and drives
 * ↑/↓/Enter/Escape with the highlight visible.
 *
 * It follows the cursor (`useSessionPages`) to reach *any* recent session and
 * refetches on open, so one created since launch is not invisible. Searching
 * and pagination are one gesture: a query with no match in the loaded window
 * pulls the next page until it finds one or the list ends. A selection opens
 * through the tab store and closes the picker, returning focus to the opener.
 */

export type SessionPickerProps = {
	/** The page size for the data path; production leaves it at the default. */
	readonly pageSize?: number;
};

export function SessionPicker({ pageSize = SESSION_PAGE_LIMIT }: SessionPickerProps) {
	const client = useClient();
	const pages = useSessionPages(client, pageSize);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const openerRef = useRef<HTMLElement | null>(null);

	useFocusTrap(dialogRef, open);
	// Escape and a click outside dismiss it — the tab strip's own dismissal.
	useMenuDismiss(open, setOpen, dialogRef);

	const matches = filterSessions(pages.rows, query);
	const loadMore = pages.loadMore;

	const openPicker = useCallback(() => {
		const opener = document.activeElement;
		openerRef.current = opener instanceof HTMLElement ? opener : null;
		// Refetch on open: the list is otherwise a snapshot of app start, and a
		// session created since the last open would stay invisible until a reload.
		pages.reload();
		setQuery("");
		setActive(0);
		setOpen(true);
	}, [pages.reload]);

	const pick = useCallback((id: string) => {
		setLastOpenedSession(id);
		const tab = { kind: TAB_KIND.session, id };
		openTab(tab);
		activateTabAndGo(tab);
		setOpen(false);
	}, []);

	// The `⌕` control's signal opens the picker; the `+` flow's signal closes it,
	// so the two overlays never stack.
	useEffect(() => {
		const close = () => setOpen(false);
		window.addEventListener(SESSION_PICKER_EVENT, openPicker);
		window.addEventListener(NEW_SESSION_EVENT, close);
		return () => {
			window.removeEventListener(SESSION_PICKER_EVENT, openPicker);
			window.removeEventListener(NEW_SESSION_EVENT, close);
		};
	}, [openPicker]);

	// Focus the field while open; hand focus back to whoever opened the picker.
	useEffect(() => {
		if (open) dialogRef.current?.querySelector("input")?.focus();
		else openerRef.current?.focus();
	}, [open]);

	// Keep the highlight inside the matches as the loaded list grows or shrinks.
	useEffect(() => {
		setActive((index) => Math.max(0, Math.min(index, matches.length - 1)));
	}, [matches.length]);

	// A query with no match in the loaded window pulls the next page, until a
	// match appears or the list ends. Debounced so typing does not fan out one
	// request per keystroke.
	const more = pages.hasMore && !pages.loadingMore;
	useEffect(() => {
		if (!open || query.trim() === "" || matches.length > 0 || !more) return;
		const timer = window.setTimeout(loadMore, PICKER_SEARCH_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [open, query, matches.length, more, loadMore]);

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
			if (chosen !== undefined) pick(chosen.id);
		}
	};

	if (!open) return null;

	return (
		<SessionPickerDialog
			query={query}
			active={active}
			dialogRef={dialogRef}
			onQuery={(value) => {
				setQuery(value);
				setActive(0);
			}}
			onKeyDown={onKeyDown}
			list={{
				rows: matches,
				query,
				status: pages.status,
				active,
				hasMore: pages.hasMore,
				loadingMore: pages.loadingMore,
				loadError: pages.loadError,
				onPick: pick,
				onHover: setActive,
				onLoadMore: loadMore,
			}}
		/>
	);
}
