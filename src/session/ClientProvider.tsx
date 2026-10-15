import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { createClient, type OpenCodeClient, probeConnection } from "@/session/client";
import { type ConnectionStore, createConnectionStore } from "@/session/connection";
import type { ConnectionState } from "@/session/connectionState";
import { resolveStartupTarget } from "@/session/environment";
import type { ResolvedTarget } from "@/session/target";

/**
 * The one client and its connection state, through a context (spec 050 §Target
 * and auth). Built once from the resolved target — never per render, never per
 * call — so plugins can later reach the same instance as `host.opencode.client`
 * (spec 040) rather than through a mutable singleton.
 */

type ClientContextValue = {
	readonly client: OpenCodeClient | null;
	readonly target: ResolvedTarget | null;
	readonly connection: ConnectionStore;
};

const ClientContext = createContext<ClientContextValue | null>(null);

function useClientContext(): ClientContextValue {
	const value = useContext(ClientContext);
	if (value === null) {
		throw new Error("ClientProvider: use the client hooks inside <ClientProvider>");
	}
	return value;
}

/** The app's one client, or `null` when no target resolved (a normal state, spec 010 §Window). */
export function useClient(): OpenCodeClient | null {
	return useClientContext().client;
}

/** The resolved target and how it resolved. */
export function useTarget(): ResolvedTarget | null {
	return useClientContext().target;
}

/** The connection state, as a subscription — the offline banner and M2.8 read this. */
export function useConnection(): ConnectionState {
	const { connection } = useClientContext();
	return useSyncExternalStore(connection.subscribe, connection.getState);
}

/** The retry action the offline banner exposes (spec 050: one retry, never a storm). */
export function useRetryConnection(): () => void {
	const { connection } = useClientContext();
	return () => {
		void connection.check();
	};
}

export type ClientProviderProps = {
	readonly children: ReactNode;
	/**
	 * Override the liveness probe. A test seam: production passes nothing and the
	 * provider probes `server.info()` on the real client.
	 */
	readonly probe?: (client: OpenCodeClient) => Promise<void>;
	/**
	 * Override the client instance itself (test seam, beside `probe`). Production
	 * passes nothing and the provider builds the client from the resolved target.
	 */
	readonly client?: OpenCodeClient | null;
};

export function ClientProvider({ children, probe, client: clientOverride }: ClientProviderProps) {
	const [bundle] = useState<ClientContextValue>(() => {
		const target = resolveStartupTarget();
		const client =
			clientOverride === undefined
				? target === null
					? null
					: createClient(target)
				: clientOverride;
		const connection = createConnectionStore({
			target,
			probe:
				client === null
					? () => Promise.resolve()
					: () => (probe ?? probeConnection)(client),
		});
		return { client, target, connection };
	});

	useEffect(() => {
		void bundle.connection.check();
		// StrictMode mounts twice; `check` de-duplicates in flight and `dispose` only
		// stops the poll, so the second mount probes again rather than staying dead.
		return () => {
			bundle.connection.dispose();
		};
	}, [bundle]);

	return <ClientContext.Provider value={bundle}>{children}</ClientContext.Provider>;
}
