import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { attachmentsFromPaths } from "@/components/composer/dropAttachments";
import { FILES_DROPPED_EVENT } from "@/constants/native";
import type { Attachment } from "@/session/promptTypes";

/**
 * The composer's native drop (M5.2).
 *
 * A Finder drop is handled by the **OS**, not by the webview: with Tauri's
 * drag-drop enabled the DOM never sees a `DataTransfer` with a path, so M2.5's
 * `onDrop` alone cannot attach one. The shell watches the window's own drag-drop
 * event and raises `oc:files-dropped` with the absolute paths; this hook turns them
 * into the **same** `Attachment` entries (`attachmentsFromPaths`) and hands them to
 * the same append the DOM route uses.
 *
 * The web build has no shell, so the hook does nothing there and the DOM route
 * stands alone. The shell is the only drop target, so a drop anywhere in the window
 * attaches to the composer that is open.
 */
export function useComposerDrop(onAttach: (attachments: readonly Attachment[]) => void): void {
	useEffect(() => {
		if (!isTauri()) return;
		let unlisten: (() => void) | null = null;
		let cancelled = false;
		void listen<readonly string[]>(FILES_DROPPED_EVENT, (event) => {
			const attachments = attachmentsFromPaths(event.payload ?? []);
			if (attachments.length > 0) onAttach(attachments);
		}).then((stop) => {
			// The listener can resolve after the composer unmounted (a fast tab switch).
			if (cancelled) stop();
			else unlisten = stop;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [onAttach]);
}
