import type { ReactNode } from "react";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { panelMenuItems } from "@/components/contextmenu/surfaceItems";
import { useSurfaceMenu } from "@/components/contextmenu/useContextMenu";
import {
	FIELD_LABEL_STYLE,
	FIELD_STYLE,
	FIELD_VALUE_STYLE,
	PANEL_BODY_STYLE,
	PANEL_STYLE,
	PANEL_TITLE_STYLE,
} from "@/components/sidebar/sidebarStyles";
import { PANEL_ID_ATTRIBUTE } from "@/constants/panelDom";

/**
 * The shared frame every sidebar panel sits in (spec 020 §Sidebar): a titled
 * region and, below it, the fields a family puts there. A panel is a pure
 * function of the data it is handed, so this file owns no data and no styling
 * decision beyond the frame.
 *
 * The frame is also the panel's **context-menu surface** (M5.1): the region is
 * focusable, so `⇧F10` reaches it, and its menu collapses the region it belongs to.
 */

export function SidebarPanel({
	title,
	panelId,
	children,
}: {
	readonly title: string;
	readonly panelId: string;
	readonly children: ReactNode;
}) {
	const menu = useSurfaceMenu(title);
	const items = panelMenuItems();
	const idProps = { [PANEL_ID_ATTRIBUTE]: panelId };
	return (
		<>
			<section
				aria-label={title}
				{...idProps}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the panel is its own context-menu surface, so ⇧F10 must be able to reach it
				tabIndex={0}
				style={PANEL_STYLE}
				onContextMenu={menu.onContextMenu}
				onKeyDown={menu.onMenuKey}
			>
				<h2 style={PANEL_TITLE_STYLE}>{title}</h2>
				<div style={PANEL_BODY_STYLE}>{children}</div>
			</section>
			{menu.point !== null ? (
				<ContextMenu items={items} at={menu.point} onClose={menu.close} />
			) : null}
		</>
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
