import { PanelField } from "@/components/sidebar/SidebarPanel";
import { SIDEBAR_EMPTY, SIDEBAR_FIELD } from "@/constants/sidebar";
import { formatSpend, formatTokens } from "@/session/amounts";
import type { ContextPanelData } from "@/session/panelData";

/**
 * The Context panel body (spec 020 §Sidebar; its acceptance: "shows the same
 * tokens/percentage the server reports"). Every figure below is a field of
 * `session.stats` (`ContextPanelData.stats`) except `In context`, which is the
 * length of `session.context`. The host draws the frame and title (M4.11).
 *
 * No percentage is shown: the pinned client's payloads carry no context-window
 * size, so a percentage would be a locally invented divisor — exactly what the
 * M2.8 rule forbids for a token figure. The counts are the server's own.
 */

export function ContextPanel({ data }: { readonly data: ContextPanelData }) {
	const stats = data.stats;
	const figure = (value: number) => (stats === null ? SIDEBAR_EMPTY : String(value));
	const tokens = (value: number) => (stats === null ? SIDEBAR_EMPTY : formatTokens(value));
	return (
		<>
			<PanelField label={SIDEBAR_FIELD.contextMessages} value={String(data.contextCount)} />
			<PanelField label={SIDEBAR_FIELD.prompts} value={figure(stats?.prompts ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.steps} value={figure(stats?.steps ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.sessions} value={figure(stats?.sessions ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.subagents} value={figure(stats?.subagents ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.tokensIn} value={tokens(stats?.tokens.input ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.tokensOut} value={tokens(stats?.tokens.output ?? 0)} />
			<PanelField
				label={SIDEBAR_FIELD.cacheRead}
				value={tokens(stats?.tokens.cache.read ?? 0)}
			/>
			<PanelField
				label={SIDEBAR_FIELD.spend}
				value={stats === null ? SIDEBAR_EMPTY : formatSpend(stats.cost)}
			/>
		</>
	);
}
