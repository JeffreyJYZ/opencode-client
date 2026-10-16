import type { OpenCodeClient } from "@opencode/client";
import type {
	CSSProperties,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
} from "react";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { elementPoint, pointerPoint } from "@/components/contextmenu/menuMath";
import { transcriptMenuItems } from "@/components/contextmenu/surfaceItems";
import {
	isContextMenuKey,
	useCloseWhenTargetGone,
	useContextMenu,
} from "@/components/contextmenu/useContextMenu";
import { TRANSCRIPT_REGION_TARGET } from "@/constants/menu";
import { ROW_ID_ATTR, TRANSCRIPT_EMPTY_LABEL, TRANSCRIPT_LABEL } from "@/constants/transcriptUi";
import type { TranscriptRow } from "@/session/transcript";
import { META_STYLE } from "./rowStyles";
import { TranscriptEntry } from "./TranscriptEntry";

/**
 * The transcript: one row per store row, in arrival order (M2.2).
 *
 * **Keyed by the store's own id.** `key={row.id}` is what makes an append an append:
 * React matches the new list against the old by key, so an earlier row is the same
 * element instance and only the row that actually changed re-renders. Nothing here
 * derives an id, numbers a row or re-indexes on append.
 *
 * The list is *not* a scroll container: spec 010 §Desktop behaviours and M2.9 own
 * tail-follow, unpinning and per-tab scroll memory, and the page's own flow scrolls
 * today. Row text already wraps rather than overflowing.
 *
 * **One menu for the whole region** (M5.1), not one per row: the region outlives
 * every row, so a menu opened from a row is anchored on the region and its target is
 * the row's own id. That is the case `useCloseWhenTargetGone` exists for — the
 * region survives a row (a replaced transcript, a switched tab) but the menu must
 * not, or it would point at nothing.
 */

const VIEW_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	width: "100%",
	padding: "var(--oc-space-4) 0",
};

const EMPTY_STYLE: CSSProperties = { ...META_STYLE, textAlign: "center" };

export type TranscriptViewProps = {
	readonly rows: readonly TranscriptRow[];
	/** The session these rows belong to: the interrupt item's target. */
	readonly sessionID: string;
	/** The store's own running flag (`transcript.running`), which gates that item. */
	readonly running: boolean;
	/** The one typed seam's client; `null` outside a connection, so the item is inert. */
	readonly client?: OpenCodeClient | null;
};

/** The row a mouse event landed in, by the store's own id. */
function rowTarget(event: ReactMouseEvent<HTMLElement>): string {
	const node = event.target instanceof Element ? event.target.closest(`[${ROW_ID_ATTR}]`) : null;
	return node?.getAttribute(ROW_ID_ATTR) ?? TRANSCRIPT_REGION_TARGET;
}

export function TranscriptView({ rows, sessionID, running, client = null }: TranscriptViewProps) {
	const menu = useContextMenu();
	// The menu's target is the row's own id (or the region): the row it names is what
	// the native items act on (M5.2), and the region's own menu has none.
	const targetRow =
		menu.target === null ? null : (rows.find((row) => row.id === menu.target) ?? null);
	const items = transcriptMenuItems({ client, sessionID, running, row: targetRow });
	// The region is always alive; a row target stops being.
	useCloseWhenTargetGone(
		menu,
		menu.target === TRANSCRIPT_REGION_TARGET || rows.some((row) => row.id === menu.target),
	);
	const onContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
		event.preventDefault();
		menu.open({
			target: rowTarget(event),
			at: pointerPoint(event),
			opener: event.currentTarget,
		});
	};
	// `⇧F10` with the region focused: the region is the opener, so focus returns to it.
	const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
		if (!isContextMenuKey(event)) return;
		event.preventDefault();
		const opener = event.currentTarget;
		menu.open({
			target: TRANSCRIPT_REGION_TARGET,
			at: elementPoint(opener.getBoundingClientRect()),
			opener,
		});
	};
	return (
		<>
			<section
				aria-label={TRANSCRIPT_LABEL}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the region is its own context-menu surface, so ⇧F10 must be able to reach it
				tabIndex={0}
				style={VIEW_STYLE}
				onContextMenu={onContextMenu}
				onKeyDown={onKeyDown}
			>
				{rows.length === 0 ? (
					<p style={EMPTY_STYLE}>{TRANSCRIPT_EMPTY_LABEL}</p>
				) : (
					rows.map((row) => <TranscriptEntry key={row.id} row={row} />)
				)}
			</section>
			{menu.point !== null ? (
				<ContextMenu items={items} at={menu.point} onClose={menu.close} />
			) : null}
		</>
	);
}
