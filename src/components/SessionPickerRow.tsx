import type { CSSProperties } from "react";
import { emphasize } from "@/components/pickerModel";
import { PICKER_OPTION_ID_PREFIX } from "@/constants/picker";
import { lastPathSegment, relativeTime, sessionTitle } from "@/pages/homeModel";
import type { SessionRow } from "@/session/useSessions";

/**
 * One picker row: the recents row's shape (title, directory's last segment,
 * relative time), with the query marked. A matched run is a `<mark>` — tokens
 * only, no raw colour, so both themes hold.
 */

export type SessionPickerRowProps = {
	readonly session: SessionRow;
	readonly query: string;
	readonly active: boolean;
	readonly onPick: () => void;
	readonly onHover: () => void;
};

const ROW_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "baseline",
	gap: "var(--oc-space-2)",
	width: "100%",
	textAlign: "left",
	background: "transparent",
	color: "var(--oc-text)",
	border: "none",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	borderRadius: "var(--oc-radius)",
	cursor: "pointer",
};

/** The keyboard highlight: a surface step *and* a visible focus ring. */
const ACTIVE_ROW_STYLE: CSSProperties = {
	...ROW_STYLE,
	background: "var(--oc-surface-raised)",
	outline: "1px solid var(--oc-focus)",
	outlineOffset: "-1px",
};

const TITLE_STYLE: CSSProperties = { fontWeight: 500 };
const META_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	fontSize: "var(--oc-font-size-meta)",
};
const TIME_STYLE: CSSProperties = {
	...META_STYLE,
	marginLeft: "auto",
	whiteSpace: "nowrap",
};
const MARK_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-accent)",
	fontWeight: 600,
};

/** The DOM id of a row, so the field can point `aria-activedescendant` at it. */
export function optionId(id: string): string {
	return PICKER_OPTION_ID_PREFIX + id;
}

function Segments({ text, query }: { readonly text: string; readonly query: string }) {
	return (
		<>
			{emphasize(text, query).map((segment) =>
				segment.match ? (
					<mark key={segment.at} style={MARK_STYLE}>
						{segment.text}
					</mark>
				) : (
					<span key={segment.at}>{segment.text}</span>
				),
			)}
		</>
	);
}

export function SessionPickerRow({
	session,
	query,
	active,
	onPick,
	onHover,
}: SessionPickerRowProps) {
	return (
		<button
			type="button"
			// An ARIA combobox option: the field owns the arrow keys and names the
			// active option with `aria-activedescendant`, so the row must never be
			// tab-reachable — `tabIndex={-1}` keeps it out of the Tab order while
			// still being focusable and clickable.
			tabIndex={-1}
			id={optionId(session.id)}
			role="option"
			aria-selected={active}
			style={active ? ACTIVE_ROW_STYLE : ROW_STYLE}
			onClick={onPick}
			onMouseMove={onHover}
		>
			<span style={TITLE_STYLE}>
				<Segments text={sessionTitle(session)} query={query} />
			</span>
			<span style={META_STYLE}>
				<Segments text={lastPathSegment(session.location.directory)} query={query} />
			</span>
			<span style={TIME_STYLE}>{relativeTime(session.time.updated)}</span>
		</button>
	);
}
