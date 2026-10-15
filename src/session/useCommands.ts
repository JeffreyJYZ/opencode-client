import { useCallback, useEffect, useState } from "react";
import { useClient } from "@/session/ClientProvider";
import type { OpenCodeClient } from "@/session/client";

/**
 * The server's command list (spec 010 §Desktop behaviours: the palette lists
 * `command.list`). Commands come from the global config's `commands` key and load
 * **asynchronously** (`docs/opencode-api.md` §4), so an empty list means "not
 * loaded yet", never "no commands"; the palette refetches each time it opens.
 *
 * `command.list` is the raw-server-input-free seam: the pinned client exposes the
 * method, so no raw route is called (spec 050 §Target and auth).
 */

/** A command row, derived from the client rather than re-imported. */
export type CommandRow = Awaited<ReturnType<OpenCodeClient["command"]["list"]>>["data"][number];

export type UseCommandsResult = {
	readonly commands: readonly CommandRow[];
	readonly reload: () => void;
};

export function useCommandsWithClient(client: OpenCodeClient | null): UseCommandsResult {
	const [commands, setCommands] = useState<readonly CommandRow[]>([]);
	const [tick, setTick] = useState(0);
	const reload = useCallback(() => {
		setTick((value) => value + 1);
	}, []);

	useEffect(() => {
		void tick;
		if (client === null) {
			setCommands([]);
			return;
		}
		let cancelled = false;
		client.command
			.list()
			.then((result) => {
				if (!cancelled) setCommands(result?.data ?? []);
			})
			.catch(() => {
				if (!cancelled) setCommands([]);
			});
		return () => {
			cancelled = true;
		};
	}, [client, tick]);

	return { commands, reload };
}

export function useCommands(): UseCommandsResult {
	return useCommandsWithClient(useClient());
}
