import { useEffect, useState } from "react";
import type { Host } from "@/plugins/sdk";

/**
 * context-meter — a sidebar panel showing the session's **own** numbers (spec 040
 * §Plugins shipped as examples): it subscribes to `session.usage.updated` and
 * renders the fields the server sent.
 *
 * There is deliberately **no context window and no percentage**: the host knows
 * no context size, so a divisor here would be invented. The panel shows the
 * server's own counts and the cost it reported, nothing derived from a guess.
 *
 * It declares no capability: it renders a contribution and reads an event, which
 * the host already hands it. It touches no document, no network and no file.
 */

const PANEL_ID = "context-meter.panel";
const PANEL_TITLE = "Context";
const EVENT = "session.usage.updated";
const NO_DATA = "No usage reported yet.";
const NOTE = "The server's own figures; no context window is assumed.";
const NOTE_STYLE = { color: "var(--oc-text-muted)", margin: 0 };
const LIST_STYLE = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
} as const;
const FIELD_STYLE = {
	display: "flex",
	justifyContent: "space-between",
	gap: "var(--oc-space-2)",
} as const;

type Usage = {
	readonly sessionID: string;
	readonly cost: number;
	readonly tokens: {
		readonly input: number;
		readonly output: number;
		readonly reasoning: number;
		readonly cache: { readonly read: number; readonly write: number };
	};
};

/** The event's `data` when it looks like a usage report, or `null`. */
function usageOf(payload: unknown): Usage | null {
	const data = (payload as { data?: unknown } | null)?.data;
	return typeof data === "object" && data !== null && "tokens" in data ? (data as Usage) : null;
}

function row(label: string, value: number | string) {
	return (
		<div style={FIELD_STYLE} key={label}>
			<span>{label}</span>
			<span>{String(value)}</span>
		</div>
	);
}

function Meter({ host }: { readonly host: Host }) {
	const [usage, setUsage] = useState<Usage | null>(null);
	useEffect(() => host.opencode.on(EVENT, (event) => setUsage(usageOf(event))), [host]);
	if (usage === null) return <p style={NOTE_STYLE}>{NO_DATA}</p>;
	const { tokens } = usage;
	return (
		<div style={LIST_STYLE}>
			{row("input", tokens.input)}
			{row("output", tokens.output)}
			{row("reasoning", tokens.reasoning)}
			{row("cache read", tokens.cache.read)}
			{row("cache write", tokens.cache.write)}
			{row("cost (USD)", usage.cost.toFixed(4))}
			<p style={NOTE_STYLE}>{NOTE}</p>
		</div>
	);
}

export default {
	setup(host: Host) {
		host.panels.register({
			id: PANEL_ID,
			title: PANEL_TITLE,
			component: () => <Meter host={host} />,
		});
	},
};
