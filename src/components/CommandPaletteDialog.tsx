import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { CommandPaletteRow, entryOptionId } from "@/components/CommandPaletteRow";
import { KeymapHelp } from "@/components/KeymapHelp";
import type { PaletteEntry } from "@/components/paletteModel";
import { LAYER } from "@/constants/layers";
import {
	PALETTE_DIALOG_LABEL,
	PALETTE_EMPTY_LABEL,
	PALETTE_LIST_ID,
	PALETTE_LIST_LABEL,
	PALETTE_NONE_LABEL,
	PALETTE_SEARCH_LABEL,
	PALETTE_SEARCH_PLACEHOLDER,
} from "@/constants/palette";

/**
 * The palette's surface: the modal overlay, the search field, the flat list of
 * four-source rows, and the keymap help. State lives in `CommandPalette`; this
 * file is the DOM, so the controller stays about behaviour.
 *
 * The overlay is the picker's, not a second mechanism: the same `--oc-scrim`
 * layer, the same `role="combobox"` + `aria-activedescendant` pattern, and the
 * same dismissal hook in the controller. The dialog is a `role="dialog"`, which
 * is also what suppresses the strip's chords while it is open.
 */

export type CommandPaletteDialogProps = {
	readonly query: string;
	readonly active: number;
	readonly entries: readonly PaletteEntry[];
	readonly dialogRef: RefObject<HTMLDivElement | null>;
	readonly onQuery: (value: string) => void;
	readonly onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
	readonly onPick: (entry: PaletteEntry) => void;
	readonly onHover: (index: number) => void;
};

const OVERLAY_STYLE: CSSProperties = {
	position: "fixed",
	inset: 0,
	display: "flex",
	alignItems: "flex-start",
	justifyContent: "center",
	paddingTop: "10vh",
	background: "var(--oc-scrim)",
	zIndex: LAYER.overlay,
};

const DIALOG_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	width: "min(640px, 90vw)",
	background: "var(--oc-surface)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
	overflow: "hidden",
};

const INPUT_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "none",
	borderBottom: "1px solid var(--oc-border)",
	padding: "var(--oc-space-3)",
	outlineColor: "var(--oc-focus)",
};

const LIST_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	maxHeight: "50vh",
	overflowY: "auto",
	padding: "var(--oc-space-1)",
};

const EMPTY_STYLE: CSSProperties = {
	margin: 0,
	padding: "var(--oc-space-3)",
	color: "var(--oc-text-muted)",
	fontSize: "var(--oc-font-size-meta)",
};

export function CommandPaletteDialog({
	query,
	active,
	entries,
	dialogRef,
	onQuery,
	onKeyDown,
	onPick,
	onHover,
}: CommandPaletteDialogProps) {
	const focused = entries[active];
	return (
		<div style={OVERLAY_STYLE}>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={PALETTE_DIALOG_LABEL}
				style={DIALOG_STYLE}
				onKeyDown={onKeyDown}
			>
				<input
					type="text"
					role="combobox"
					aria-expanded
					aria-controls={PALETTE_LIST_ID}
					aria-activedescendant={
						focused === undefined ? undefined : entryOptionId(focused.id)
					}
					aria-label={PALETTE_SEARCH_LABEL}
					placeholder={PALETTE_SEARCH_PLACEHOLDER}
					value={query}
					onChange={(event) => onQuery(event.target.value)}
					style={INPUT_STYLE}
				/>
				<div
					id={PALETTE_LIST_ID}
					role="listbox"
					aria-label={PALETTE_LIST_LABEL}
					style={LIST_STYLE}
				>
					{entries.map((entry, index) => (
						<CommandPaletteRow
							key={entry.id}
							entry={entry}
							query={query}
							active={index === active}
							onPick={() => onPick(entry)}
							onHover={() => onHover(index)}
						/>
					))}
				</div>
				{entries.length === 0 && (
					<p role="status" style={EMPTY_STYLE}>
						{query.trim() === "" ? PALETTE_EMPTY_LABEL : PALETTE_NONE_LABEL}
					</p>
				)}
				<KeymapHelp />
			</div>
		</div>
	);
}
