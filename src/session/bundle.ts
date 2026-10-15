import { createClient, type OpenCodeClient, probeConnection } from "@/session/client";
import { type ConnectionStore, createConnectionStore } from "@/session/connection";
import type { ResolvedTarget } from "@/session/target";

/**
 * One client and its connection state, built for one target (spec 050 §Target
 * and auth). Separated from the provider so "which target" and "render it" are
 * two modules; `target === null` is the documented "no target" bundle, whose
 * probe resolves without ever calling the server.
 */

export type ClientBundle = {
	readonly client: OpenCodeClient | null;
	readonly target: ResolvedTarget | null;
	readonly connection: ConnectionStore;
};

/** A test's probe override; production passes nothing and the probe is `server.info()`. */
export type ProbeOverride = ((client: OpenCodeClient) => Promise<void>) | undefined;

export function buildBundle(
	target: ResolvedTarget | null,
	probe: ProbeOverride,
	clientOverride: OpenCodeClient | null | undefined,
): ClientBundle {
	const client =
		clientOverride === undefined
			? target === null
				? null
				: createClient(target)
			: clientOverride;
	const connection = createConnectionStore({
		target,
		probe: client === null ? () => Promise.resolve() : () => (probe ?? probeConnection)(client),
	});
	return { client, target, connection };
}
