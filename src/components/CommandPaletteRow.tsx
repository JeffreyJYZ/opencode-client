import type { CSSProperties } from "react";
import type { PaletteEntry } from "@/components/paletteModel";
import { emphasize } from "@/components/pickerModel";
import { PALETTE_OPTION_ID_PREFIX } from "@/constants/palette";

/**
 * One palette row: its label, the source it came from, and its chord when the
 * registry declares one. The matched run is a `<mark>` — tokens only, no raw
 * colour — and the row is a `role="option"` outside the Tab order, because the
 * field owns the arrow keys and names the active row with
 * `aria-activedescendant` (the same combobox pattern the picker uses).
 */

export type CommandPaletteRowProps = {
	readonly entry: PaletteEntry;
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

const DETAIL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	fontSize: "var(--oc-font-size-meta)",
};

const CHORD_STYLE: CSSProperties = {
	...DETAIL_STYLE,
	marginLeft: "auto",
	whiteSpace: "nowrap",
};

const MARK_STYLE: CSSProperties = { background: "transparent", color: "var(--oc-accent)" };

/** The row's DOM id, so the field can point `aria-activedescendant` at it. */
export function entryOptionId(id: string): string {
	return PALETTE_OPTION_ID_PREFIX + id;
}

/** The matched run of one text, marked. */
function Marked({ text, query }: { readonly text: string; readonly query: string }) {
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

export function CommandPaletteRow({
	entry,
	query,
	active,
	onPick,
	onHover,
}: CommandPaletteRowProps) {
	return (
		<button
			type="button"
			tabIndex={-1}
			id={entryOptionId(entry.id)}
			role="option"
			aria-selected={active}
			style={active ? ACTIVE_ROW_STYLE : ROW_STYLE}
			onClick={onPick}
			onMouseMove={onHover}
		>
			<span style={TITLE_STYLE}>
				<Marked text={entry.label} query={query} />
			</span>
			<span style={DETAIL_STYLE}>
				<Marked text={entry.detail} query={query} />
			</span>
			{entry.chord === undefined ? null : (
				<kbd className="oc-code" style={CHORD_STYLE}>
					{entry.chord}
				</kbd>
			)}
		</button>
	);
}
