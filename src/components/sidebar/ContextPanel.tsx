import { PanelField } from "@/components/sidebar/SidebarPanel";
import { SIDEBAR_EMPTY, SIDEBAR_FIELD } from "@/constants/sidebar";
import { formatSpend, formatTokens } from "@/session/amounts";
import type { ContextPanelData } from "@/session/panelData";

/**
 * The Context panel body (spec 020 §Sidebar; its acceptance: "shows the same
 * tokens/spend the server reports"). Every figure is **this session's own**,
 * read from `session.get` (`ContextPanelData.tokens` / `.cost`) — the same call
 * and the same fields the statusline shows, so the two can no longer disagree.
 * `In context` is the length of `session.context`. The host draws the frame and
 * title (M4.11).
 *
 * The panel deliberately does **not** read `session.stats`: that route
 * (`GET /api/experimental/session/stats`) has no session in its path and is a
 * project/server-wide usage report — M2.15 measured its `cost` at ten times one
 * session's own figure, which is the ~10× this panel used to print. The fields
 * only a cross-session report can produce (`sessions`, `subagents`, `prompts`,
 * `steps`) are gone with it.
 *
 * No percentage is shown: the pinned client's payloads carry no context-window
 * size, so a percentage would be a locally invented divisor — exactly what the
 * M2.8 rule forbids for a token figure. The counts are the server's own.
 */

export function ContextPanel({ data }: { readonly data: ContextPanelData }) {
	const tokens = (value: number) => (data.tokens === null ? SIDEBAR_EMPTY : formatTokens(value));
	return (
		<>
			<PanelField label={SIDEBAR_FIELD.contextMessages} value={String(data.contextCount)} />
			<PanelField label={SIDEBAR_FIELD.tokensIn} value={tokens(data.tokens?.input ?? 0)} />
			<PanelField label={SIDEBAR_FIELD.tokensOut} value={tokens(data.tokens?.output ?? 0)} />
			<PanelField
				label={SIDEBAR_FIELD.cacheRead}
				value={tokens(data.tokens?.cache.read ?? 0)}
			/>
			<PanelField
				label={SIDEBAR_FIELD.spend}
				value={data.cost === null ? SIDEBAR_EMPTY : formatSpend(data.cost)}
			/>
		</>
	);
}
