import type { CSSProperties } from "react";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { recentsMenuItems } from "@/components/contextmenu/surfaceItems";
import { useSurfaceMenu } from "@/components/contextmenu/useContextMenu";
import { agentModel, lastPathSegment, relativeTime, sessionTitle } from "@/pages/homeModel";
import type { SessionRow } from "@/session/useSessions";

/**
 * One recents row (M1.2), split out of `HomeRecents` so the row owns its own
 * context menu (M5.1) and the list file stays a list.
 *
 * The row's own `Enter` — a `<button>`'s default — is the keyboard route for its
 * menu's "Open" item, which is why the item's accelerator is the element's route
 * rather than a chord: "open *this* row" has no global key, and the row is already
 * the control that performs it.
 */

const ROW_STYLE: CSSProperties = {
	width: "100%",
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-3)",
	textAlign: "left",
};

const TITLE_STYLE: CSSProperties = {
	fontSize: "var(--oc-font-ui-size)",
	fontWeight: 500,
	color: "var(--oc-text)",
};

const META_STYLE: CSSProperties = {
	fontSize: "var(--oc-font-size-meta)",
	color: "var(--oc-text-muted)",
	whiteSpace: "nowrap",
};

export type RecentsRowProps = {
	readonly session: SessionRow;
	readonly openSession: (id: string) => void;
};

export function RecentsRow({ session, openSession }: RecentsRowProps) {
	const menu = useSurfaceMenu(session.id);
	const items = recentsMenuItems(session.id);
	const model = agentModel(session);
	return (
		<>
			<button
				type="button"
				className="oc-row"
				style={ROW_STYLE}
				onClick={() => openSession(session.id)}
				onContextMenu={menu.onContextMenu}
				onKeyDown={menu.onMenuKey}
			>
				<span style={TITLE_STYLE}>{sessionTitle(session)}</span>
				<span style={META_STYLE}>
					{lastPathSegment(session.location.directory)} ·{" "}
					{relativeTime(session.time.updated)}
					{model !== null ? ` · ${model}` : ""}
				</span>
			</button>
			{menu.point !== null ? (
				<ContextMenu items={items} at={menu.point} onClose={menu.close} />
			) : null}
		</>
	);
}
