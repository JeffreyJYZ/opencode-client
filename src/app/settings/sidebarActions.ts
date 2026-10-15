import { clampSidebarWidth } from "@/app/settings/sidebar";
import { getSettings, updateSettings } from "@/app/settings/store";

/**
 * The sidebar's write path (spec 010 §Persistence, §Desktop behaviours). Every
 * write goes through `updateSettings`, so there is still exactly one serializer
 * for the blob — and the width is clamped **here**, in the store, rather than
 * only in CSS, which is the M2.7 acceptance ("the bound lives in the store").
 */

/** Persist a new width. Out-of-range input is clamped, not rejected. */
export function setSidebarWidth(width: number): void {
	const sidebar = getSettings().sidebar;
	const clamped = clampSidebarWidth(width);
	if (clamped === sidebar.width) return;
	updateSettings({ sidebar: { ...sidebar, width: clamped } });
}

/** Persist visibility; the ⌘B toggle (`keymap.ts`) flips it. */
export function setSidebarVisible(visible: boolean): void {
	const sidebar = getSettings().sidebar;
	if (sidebar.visible === visible) return;
	updateSettings({ sidebar: { ...sidebar, visible } });
}

/** ⌘B's action: the one toggle both the keymap and a future menu/palette call. */
export function toggleSidebar(): void {
	setSidebarVisible(!getSettings().sidebar.visible);
}
