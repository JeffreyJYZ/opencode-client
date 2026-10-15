import { useCallback, useEffect, useState } from "react";
import { setLastOpenedSession } from "@/app/lastOpened";
import { updateSettings } from "@/app/settings/store";
import { useSettings } from "@/app/settings/useSettings";
import { activateTabAndGo } from "@/app/tabSync";
import { openTab } from "@/app/tabs";
import { NEW_SESSION_EVENT, TAB_KIND } from "@/constants/tabs";
import type { DirectoryPicker } from "@/native/pickDirectory";
import { defaultDirectoryPicker, isNativeDirectoryPickerAvailable } from "@/native/pickDirectory";
import { useClient } from "@/session/ClientProvider";
import { addRecentDirectory } from "@/session/recentDirectories";

export type NewSessionFlow = {
	readonly recents: readonly string[];
	readonly lastUsed: string | null;
	readonly open: boolean;
	readonly path: string;
	readonly error: string | null;
	readonly busy: boolean;
	readonly setPath: (value: string) => void;
	readonly start: () => Promise<void>;
	readonly submit: () => Promise<void>;
	readonly cancel: () => void;
	readonly pickChip: (directory: string) => Promise<void>;
};

export type UseNewSessionFlowOptions = {
	readonly picker?: DirectoryPicker;
	readonly pickerAvailable?: boolean;
};

export function useNewSessionFlow(options?: UseNewSessionFlowOptions): NewSessionFlow {
	const client = useClient();
	const pickerAvailable = options?.pickerAvailable ?? isNativeDirectoryPickerAvailable();
	const picker = options?.picker ?? defaultDirectoryPicker;

	const [open, setOpen] = useState(false);
	const [path, setPath] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	// The chips and the picker's pre-selection are settings, not component state:
	// one writer, and a restart keeps them (spec 010 §Persistence, M1.5).
	const recents = useSettings().settings.recentDirectories;
	const lastUsed = recents[0] ?? null;

	const openSession = useCallback((id: string) => {
		setLastOpenedSession(id);
		const tab = { kind: TAB_KIND.session, id };
		openTab(tab);
		activateTabAndGo(tab);
	}, []);

	const createInDirectory = useCallback(
		async (directory: string) => {
			if (client === null) throw new Error("No server connected");
			const trimmed = directory.trim();
			if (trimmed === "") throw new Error("Directory required");
			setBusy(true);
			setError(null);
			try {
				const input = { location: { directory: trimmed } } as unknown;
				const session = (await client.session.create(input as never)) as { id: string };
				updateSettings({ recentDirectories: addRecentDirectory(recents, trimmed) });
				setOpen(false);
				openSession(session.id);
			} catch (caught) {
				const message = caught instanceof Error ? caught.message : String(caught);
				setError(message);
				setOpen(true);
				setPath(trimmed);
			} finally {
				setBusy(false);
			}
		},
		[client, openSession, recents],
	);

	const start = useCallback(async () => {
		setError(null);
		if (pickerAvailable) {
			const picked = await picker(lastUsed ?? undefined);
			if (picked === null) return;
			await createInDirectory(picked);
		} else {
			setPath(lastUsed ?? "");
			setOpen(true);
		}
	}, [pickerAvailable, picker, lastUsed, createInDirectory]);

	const submit = useCallback(async () => {
		await createInDirectory(path);
	}, [createInDirectory, path]);

	const cancel = useCallback(() => {
		setOpen(false);
		setError(null);
	}, []);

	const pickChip = useCallback(
		async (directory: string) => {
			await createInDirectory(directory);
		},
		[createInDirectory],
	);

	useEffect(() => {
		const handler = () => {
			void start();
		};
		window.addEventListener(NEW_SESSION_EVENT, handler);
		return () => window.removeEventListener(NEW_SESSION_EVENT, handler);
	}, [start]);

	return {
		recents,
		lastUsed,
		open,
		path,
		error,
		busy,
		setPath,
		start,
		submit,
		cancel,
		pickChip,
	};
}
