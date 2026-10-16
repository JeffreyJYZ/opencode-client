import { useMemo, useSyncExternalStore } from "react";
import { useSettingsSections } from "@/app/settings/sections";
import { useTabs } from "@/app/useTabs";
import { buildEntries, type PaletteEntry } from "@/components/paletteModel";
import { SESSION_PAGE_LIMIT } from "@/constants/sessions";
import { listCommands, subscribeToCommands } from "@/plugins/commands";
import { useClient } from "@/session/ClientProvider";
import { useCommandsWithClient } from "@/session/useCommands";
import { useSessionPages } from "@/session/useSessionPages";

/**
 * The palette's data path (spec 010 §Desktop behaviours). `Shell.tsx` mounts the
 * palette unconditionally, so its two server sources must **fetch on open**, never
 * on mount: passing `null` as the client while closed leaves `useSessionPages` and
 * `useCommandsWithClient` idle — a null client is a no-op in both — and the first
 * open flips the real client in, which runs each hook's fetch once (and once more
 * per open, the refetch the palette wants). Sessions follow the cursor, so a root
 * older than one page is findable by typing rather than truncated at the page size.
 *
 * Tabs, settings sections and the host's command registry are in-memory, not
 * server sources, so they mount eagerly and are unaffected by the gate.
 */
export type PaletteData = {
	readonly entries: readonly PaletteEntry[];
	/** The next session page exists and none is in flight — a query may pull it. */
	readonly canLoadMore: boolean;
	readonly loadMore: () => void;
};

export function usePaletteData(open: boolean, pageSize = SESSION_PAGE_LIMIT): PaletteData {
	const client = useClient();
	const tabs = useTabs();
	const sections = useSettingsSections();
	const pages = useSessionPages(open ? client : null, pageSize);
	const { commands } = useCommandsWithClient(open ? client : null);
	const pluginCommands = useSyncExternalStore(subscribeToCommands, listCommands);
	const entries = useMemo(
		() =>
			buildEntries({
				tabs: tabs.tabs,
				sessions: pages.rows,
				commands,
				pluginCommands,
				sections,
			}),
		[tabs, pages.rows, commands, pluginCommands, sections],
	);
	return { entries, canLoadMore: pages.hasMore && !pages.loadingMore, loadMore: pages.loadMore };
}
