import { useEffect } from "react";
import { buildHostPorts } from "@/app/hostPorts";
import { setAppPorts } from "@/plugins/appPorts";
import { useClient, useTranscripts } from "@/session/ClientProvider";

/**
 * Publishes the app's live host ports (M4.10, spec 040 §The host) to the plugin
 * loader. It renders nothing; it sits **inside** `ClientProvider` so it can read
 * the one client and transcript store, and re-publishes whenever either is
 * rebuilt (a connect/disconnect makes a new bundle, and `AppPorts` is re-run).
 *
 * The first publish is therefore after the client bundle exists, which is why the
 * manager's **load** of enabled plugins hangs off `subscribeToAppPorts` rather
 * than off the pre-render boot call.
 */
export function AppPorts() {
	const client = useClient();
	const transcripts = useTranscripts();
	useEffect(() => {
		let cancelled = false;
		// `buildHostPorts` reads the shell's data root (async), so the ports are
		// published when it resolves; a superseded build (a connect/disconnect
		// rebuilt the bundle) must not overwrite the newer one.
		void buildHostPorts({ client, transcripts }).then((ports) => {
			if (!cancelled) setAppPorts(ports);
		});
		return () => {
			cancelled = true;
		};
	}, [client, transcripts]);
	return null;
}
