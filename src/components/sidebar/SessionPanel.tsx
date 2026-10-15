import { PanelField, SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { EMPTY_STYLE } from "@/components/sidebar/sidebarStyles";
import {
	SIDEBAR_EMPTY,
	SIDEBAR_FIELD,
	SIDEBAR_PANEL_LABEL,
	SIDEBAR_UNTITLED,
} from "@/constants/sidebar";
import { lastPathSegment, relativeTime } from "@/pages/homeModel";
import type { SessionPanelData } from "@/session/panelData";

/**
 * The Session panel (spec 020 §Sidebar): the open session's identity — directory,
 * branch, title, agent, model, updated. Source: `session.get` (`SessionPanelData.
 * info`) and `vcs.get` (`branch`, resolved by the bounded retry in `vcsBranch`).
 */

export function SessionPanel({ data }: { readonly data: SessionPanelData }) {
	const { info, branch } = data;
	if (info === null) {
		return (
			<SidebarPanel title={SIDEBAR_PANEL_LABEL.session}>
				<p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>
			</SidebarPanel>
		);
	}
	const title = info.title?.trim();
	return (
		<SidebarPanel title={SIDEBAR_PANEL_LABEL.session}>
			<PanelField
				label={SIDEBAR_FIELD.directory}
				value={lastPathSegment(info.location.directory)}
			/>
			<PanelField label={SIDEBAR_FIELD.branch} value={branch ?? SIDEBAR_EMPTY} />
			<PanelField
				label={SIDEBAR_FIELD.title}
				value={title === undefined || title === "" ? SIDEBAR_UNTITLED : title}
			/>
			<PanelField label={SIDEBAR_FIELD.agent} value={info.agent ?? SIDEBAR_EMPTY} />
			<PanelField label={SIDEBAR_FIELD.model} value={info.model?.id ?? SIDEBAR_EMPTY} />
			<PanelField label={SIDEBAR_FIELD.updated} value={relativeTime(info.time.updated)} />
		</SidebarPanel>
	);
}
