import type { CSSProperties } from "react";
import { KEYBOARD_SHORTCUTS } from "@/constants/keys";
import { PALETTE_HELP_LABEL } from "@/constants/palette";

/**
 * The keyboard map, rendered from the registry (spec 010 §Desktop behaviours:
 * *single table in `src/constants/keys.ts`, rendered into the palette's help*).
 * No chord is typed here — every label comes from the binding, so the help cannot
 * drift from what the handlers match.
 */

const HELP_STYLE: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: "var(--oc-space-1) var(--oc-space-4)",
	margin: 0,
	padding: "var(--oc-space-2) var(--oc-space-3)",
	borderTop: "1px solid var(--oc-border)",
	color: "var(--oc-text-muted)",
	fontSize: "var(--oc-font-size-meta)",
};

const ROW_STYLE: CSSProperties = { display: "flex", gap: "var(--oc-space-1)" };

const CHORD_STYLE: CSSProperties = {
	margin: 0,
	color: "var(--oc-text)",
	fontWeight: 500,
};

export function KeymapHelp() {
	return (
		<dl aria-label={PALETTE_HELP_LABEL} style={HELP_STYLE}>
			{KEYBOARD_SHORTCUTS.map((binding) => (
				<div key={binding.id} style={ROW_STYLE}>
					<dt style={CHORD_STYLE}>
						<kbd className="oc-code">{binding.label}</kbd>
					</dt>
					<dd style={{ margin: 0 }}>{binding.description}</dd>
				</div>
			))}
		</dl>
	);
}
