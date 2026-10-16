import type { V2Event } from "@opencode/client";
import type { OpenCodeClient } from "@/session/client";

/**
 * The `opencode` service (spec 040 §The host, `opencode.client` / `opencode.on`).
 *
 * - `client` is **the app's one client**, or `null` when no target resolved
 *   (spec 010 §Window). A plugin checks for `null`; a disconnected server is a
 *   null client, never a throw into the plugin.
 * - `on(event, handler)` filters the server's one event stream for the plugin. One
 *   upstream subscription serves every handler, and it is opened lazily and
 *   dropped when the last handler unsubscribes. With no source (no client), `on`
 *   returns a working unsubscribe that simply never fires — so a plugin can
 *   subscribe before the app connects and nothing throws.
 */

/** How the host reaches the stream; the app passes its ingest's subscription. */
export type PluginEventSource = (handler: (event: V2Event) => void) => () => void;

export type PluginOpenCode = {
	readonly client: OpenCodeClient | null;
	on(event: string, handler: (event: V2Event) => void): () => void;
};

const ALL_EVENTS = "*";
const PREFIX = ".*";

/** Whether an event type matches a subscription's pattern: `*`, `session.*`, or exact. */
export function matchesEvent(pattern: string, type: string): boolean {
	if (pattern === ALL_EVENTS) return true;
	if (pattern.endsWith(PREFIX)) return type.startsWith(pattern.slice(0, -PREFIX.length + 1));
	return pattern === type;
}

export type OpenCodeInput = {
	readonly client: OpenCodeClient | null;
	readonly subscribe?: PluginEventSource;
};

export function createPluginOpenCode(input: OpenCodeInput): PluginOpenCode {
	const handlers = new Set<{ pattern: string; handler: (event: V2Event) => void }>();
	let unsubscribe: (() => void) | null = null;

	function dispatch(event: V2Event): void {
		for (const entry of [...handlers]) {
			if (matchesEvent(entry.pattern, event.type)) entry.handler(event);
		}
	}

	function open(): void {
		if (unsubscribe !== null || input.subscribe === undefined) return;
		unsubscribe = input.subscribe(dispatch);
	}

	function close(): void {
		unsubscribe?.();
		unsubscribe = null;
	}

	return {
		client: input.client,
		on(event, handler) {
			const entry = { pattern: event, handler };
			handlers.add(entry);
			open();
			return () => {
				handlers.delete(entry);
				if (handlers.size === 0) close();
			};
		},
	};
}
