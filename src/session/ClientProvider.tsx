import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";
import type { ServerTarget } from "@/app/settings/server";
import { updateSettings } from "@/app/settings/store";
import { buildBundle, type ClientBundle, type ProbeOverride } from "@/session/bundle";
import type { OpenCodeClient } from "@/session/client";
import type { ConnectionState } from "@/session/connectionState";
import { readAndStripAuthToken, resolveTargets } from "@/session/environment";
import type { ResolvedTarget } from "@/session/target";

/**
 * The one client and its connection state, through a context (spec 050 §Target
 * and auth). Rebuilt only when the target actually changes — `connect` and
 * `disconnect` are the only writers — never per render, never per call, so
 * plugins can later reach the same instance as `host.opencode.client` (spec 040)
 * rather than through a mutable singleton.
 */

type ClientContextValue = ClientBundle & {
	/** Store the target and connect to it (spec 050 §Target and auth). */
	readonly connect: (server: ServerTarget) => void;
	/** Drop the live connection. The blob keeps the target, so a relaunch reconnects. */
	readonly disconnect: () => void;
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

/** The connect action the settings section submits with. */
export function useConnect(): (server: ServerTarget) => void {
	return useClientContext().connect;
}

/** The disconnect action the settings section offers beside it. */
export function useDisconnect(): () => void {
	return useClientContext().disconnect;
}

export type ClientProviderProps = {
	readonly children: ReactNode;
	/** Override the liveness probe (test seam); production probes `server.info()`. */
	readonly probe?: ProbeOverride;
	/** Override the client instance itself (test seam, beside `probe`). */
	readonly client?: OpenCodeClient | null;
};

export function ClientProvider({ children, probe, client: clientOverride }: ClientProviderProps) {
	// The `auth_token` is consumed (and stripped from the address bar) exactly once,
	// before the first paint; every later resolution reuses the password it yielded.
	const [authTokenPassword] = useState(() => readAndStripAuthToken());
	const build = useCallback(
		(target: ResolvedTarget | null) => buildBundle(target, probe, clientOverride),
		[probe, clientOverride],
	);
	const [bundle, setBundle] = useState(() => build(resolveTargets(authTokenPassword)));

	useEffect(() => {
		void bundle.connection.check();
		// StrictMode mounts twice; `check` de-duplicates in flight and `dispose` only
		// stops the poll, so the second mount probes again rather than staying dead.
		return () => {
			bundle.connection.dispose();
		};
	}, [bundle]);

	const connect = useCallback(
		(server: ServerTarget) => {
			updateSettings({ server });
			setBundle(build(resolveTargets(authTokenPassword)));
		},
		[build, authTokenPassword],
	);
	const disconnect = useCallback(() => {
		setBundle(build(null));
	}, [build]);
	const value = useMemo<ClientContextValue>(
		() => ({ ...bundle, connect, disconnect }),
		[bundle, connect, disconnect],
	);

	return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
