import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { setLastOpenedSession } from "@/app/lastOpened";
import { activateTabAndGo } from "@/app/tabSync";
import { openTab } from "@/app/tabs";
import { filterSessions } from "@/components/pickerModel";
import { SessionPickerDialog } from "@/components/SessionPickerDialog";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import { SESSION_PAGE_LIMIT } from "@/constants/sessions";
import { SESSION_PICKER_EVENT, TAB_KIND } from "@/constants/tabs";
import { useClient } from "@/session/ClientProvider";
import { useSessionPages } from "@/session/useSessionPages";

/**
 * The session picker `⌕` (spec 010 §Top nav: *all root sessions, searchable*;
 * §Desktop behaviours). It listens for the `oc:session-picker` event the `⌕`
 * control dispatches, lists root sessions newest first, searches title and
 * directory, and drives ↑/↓/Enter/Escape with the highlight visible.
 *
 * It reaches past the first page by **following the cursor** (`useSessionPages`):
 * a bigger fixed window would still be a guess, and the row's evidence is *any*
 * session past the first page, which a bound cannot promise. Search and
 * pagination are one gesture — a query with no match in the loaded window pulls
 * the next page until it finds one or the cursor runs out.
 *
 * A selection opens through the tab store (`openTab` + `activateTabAndGo`),
 * never by hand, and closes the picker. Escape, a click outside, or a selection
 * hands focus back to whoever opened it.
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
		setQuery("");
		setActive(0);
		setOpen(true);
	}, []);

	const pick = useCallback((id: string) => {
		setLastOpenedSession(id);
		const tab = { kind: TAB_KIND.session, id };
		openTab(tab);
		activateTabAndGo(tab);
		setOpen(false);
	}, []);

	// The `⌕` nav control's signal.
	useEffect(() => {
		window.addEventListener(SESSION_PICKER_EVENT, openPicker);
		return () => window.removeEventListener(SESSION_PICKER_EVENT, openPicker);
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
	// match appears or the cursor runs out.
	const more = pages.hasMore && !pages.loadingMore;
	useEffect(() => {
		if (!open || query.trim() === "" || matches.length > 0 || !more) return;
		loadMore();
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
