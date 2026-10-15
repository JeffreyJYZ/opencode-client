import type { CSSProperties, UIEvent } from "react";
import { SessionPickerRow } from "@/components/SessionPickerRow";
import {
	PICKER_EMPTY_LABEL,
	PICKER_ERROR_LABEL,
	PICKER_LIST_ID,
	PICKER_LIST_LABEL,
	PICKER_LOAD_MORE_LABEL,
	PICKER_LOADING_LABEL,
	PICKER_MORE_ERROR_LABEL,
	PICKER_NO_MATCH_LABEL,
	PICKER_NONE_LABEL,
	PICKER_SCROLL_THRESHOLD_PX,
} from "@/constants/picker";
import { SESSION_STATUS, type SessionStatus } from "@/constants/sessions";
import type { SessionRow } from "@/session/useSessions";

/**
 * The picker's list: the loaded rows, then its own honest state (spec 010
 * §Desktop behaviours: never a silent failure). "Load more" is how the next
 * page arrives; the cursor itself lives in the data path.
 */

export type SessionPickerListProps = {
	readonly rows: readonly SessionRow[];
	readonly query: string;
	readonly status: SessionStatus;
	readonly active: number;
	readonly hasMore: boolean;
	readonly loadingMore: boolean;
	readonly loadError: boolean;
	readonly onPick: (id: string) => void;
	readonly onHover: (index: number) => void;
	readonly onLoadMore: () => void;
};

const LIST_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	maxHeight: "50vh",
	overflowY: "auto",
};

const HINT_STYLE: CSSProperties = {
	margin: "var(--oc-space-2)",
	color: "var(--oc-text-muted)",
	fontSize: "var(--oc-font-size-meta)",
};

const MORE_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
};

/** The one sentence this list owes the user, or `null` when it has rows. */
function hint(status: SessionStatus, rowCount: number, query: string): string | null {
	if (status === SESSION_STATUS.loading) return PICKER_LOADING_LABEL;
	if (status === SESSION_STATUS.none) return PICKER_NONE_LABEL;
	if (status === SESSION_STATUS.error) return PICKER_ERROR_LABEL;
	if (status === SESSION_STATUS.empty) return PICKER_EMPTY_LABEL;
	if (rowCount === 0 && query.trim() !== "") return PICKER_NO_MATCH_LABEL;
	return null;
}

export function SessionPickerList({
	rows,
	query,
	status,
	active,
	hasMore,
	loadingMore,
	loadError,
	onPick,
	onHover,
	onLoadMore,
}: SessionPickerListProps) {
	const text = hint(status, rows.length, query);
	const onScroll = (event: UIEvent<HTMLDivElement>) => {
		const element = event.currentTarget;
		const fromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
		if (fromBottom <= PICKER_SCROLL_THRESHOLD_PX) onLoadMore();
	};
	return (
		<div>
			<div
				id={PICKER_LIST_ID}
				role="listbox"
				aria-label={PICKER_LIST_LABEL}
				style={LIST_STYLE}
				onScroll={onScroll}
			>
				{rows.map((session, index) => (
					<SessionPickerRow
						key={session.id}
						session={session}
						query={query}
						active={index === active}
						onPick={() => onPick(session.id)}
						onHover={() => onHover(index)}
					/>
				))}
			</div>
			{text !== null && (
				<p role="status" style={HINT_STYLE}>
					{text}
				</p>
			)}
			{hasMore && (
				<button
					type="button"
					style={MORE_STYLE}
					disabled={loadingMore}
					onClick={onLoadMore}
				>
					{PICKER_LOAD_MORE_LABEL}
				</button>
			)}
			{loadError && (
				<p role="status" style={HINT_STYLE}>
					{PICKER_MORE_ERROR_LABEL}
				</p>
			)}
		</div>
	);
}
