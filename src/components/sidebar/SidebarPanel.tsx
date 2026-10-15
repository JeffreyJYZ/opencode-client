import type { ReactNode } from "react";
import {
	FIELD_LABEL_STYLE,
	FIELD_STYLE,
	FIELD_VALUE_STYLE,
	PANEL_BODY_STYLE,
	PANEL_STYLE,
	PANEL_TITLE_STYLE,
} from "@/components/sidebar/sidebarStyles";

/**
 * The shared frame every sidebar panel sits in (spec 020 §Sidebar): a titled
 * region and, below it, the fields a family puts there. A panel is a pure
 * function of the data it is handed, so this file owns no data and no styling
 * decision beyond the frame.
 */

export function SidebarPanel({
	title,
	children,
}: {
	readonly title: string;
	readonly children: ReactNode;
}) {
	return (
		<section aria-label={title} style={PANEL_STYLE}>
			<h2 style={PANEL_TITLE_STYLE}>{title}</h2>
			<div style={PANEL_BODY_STYLE}>{children}</div>
		</section>
	);
}

/** One labelled figure. The label is always rendered, so no value is anonymous. */
export function PanelField({ label, value }: { readonly label: string; readonly value: string }) {
	return (
		<div style={FIELD_STYLE}>
			<span style={FIELD_LABEL_STYLE}>{label}</span>
			<span style={FIELD_VALUE_STYLE}>{value}</span>
		</div>
	);
}
