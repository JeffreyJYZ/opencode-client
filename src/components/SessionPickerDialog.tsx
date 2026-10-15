import type { CSSProperties, KeyboardEvent, RefObject } from "react";
import { SessionPickerList, type SessionPickerListProps } from "@/components/SessionPickerList";
import { optionId } from "@/components/SessionPickerRow";
import {
	PICKER_DIALOG_LABEL,
	PICKER_LIST_ID,
	PICKER_SEARCH_LABEL,
	PICKER_SEARCH_PLACEHOLDER,
} from "@/constants/picker";

/**
 * The picker's surface: the modal overlay, the search field, and the list. All
 * state lives in `SessionPicker`; this file is the DOM and nothing else, so the
 * controller stays about behaviour.
 *
 * The dialog is a `role="dialog"` + `aria-modal` modal, and the field is a
 * `role="combobox"` whose `aria-activedescendant` names the highlighted option
 * — the row that carries the visible focus ring.
 */

export type SessionPickerDialogProps = {
	readonly query: string;
	readonly active: number;
	readonly dialogRef: RefObject<HTMLDivElement | null>;
	readonly onQuery: (value: string) => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
	readonly list: SessionPickerListProps;
};

const OVERLAY_STYLE: CSSProperties = {
	position: "fixed",
	inset: 0,
	display: "flex",
	alignItems: "flex-start",
	justifyContent: "center",
	paddingTop: "10vh",
	background: "rgba(0, 0, 0, 0.5)",
	zIndex: 60,
};

const DIALOG_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	width: "min(640px, 90vw)",
	padding: "var(--oc-space-3)",
	background: "var(--oc-surface)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
};

const INPUT_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	outlineColor: "var(--oc-focus)",
};

export function SessionPickerDialog({
	query,
	active,
	dialogRef,
	onQuery,
	onKeyDown,
	list,
}: SessionPickerDialogProps) {
	const focused = list.rows[active];
	return (
		<div style={OVERLAY_STYLE}>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={PICKER_DIALOG_LABEL}
				style={DIALOG_STYLE}
				onKeyDown={onKeyDown}
			>
				<input
					type="text"
					role="combobox"
					aria-expanded
					aria-controls={PICKER_LIST_ID}
					aria-activedescendant={focused === undefined ? undefined : optionId(focused.id)}
					aria-label={PICKER_SEARCH_LABEL}
					placeholder={PICKER_SEARCH_PLACEHOLDER}
					value={query}
					onChange={(event) => onQuery(event.target.value)}
					style={INPUT_STYLE}
				/>
				<SessionPickerList {...list} />
			</div>
		</div>
	);
}
