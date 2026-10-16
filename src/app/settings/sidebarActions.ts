import { clampSidebarWidth } from "@/app/settings/sidebar";
import { isNarrowViewport } from "@/app/settings/sidebarVisibility";
import { getSettings, updateSettings } from "@/app/settings/store";

/**
 * The sidebar's write path (spec 010 §Persistence, §Desktop behaviours). Every
 * write goes through `updateSettings`, so there is still exactly one serializer
 * for the blob — and the width is clamped **here**, in the store, rather than
 * only in CSS, which is the M2.7 acceptance ("the bound lives in the store").
 *
 * M2.25 adds the narrow window's own value, written by ⌘B when the viewport is
 * narrow; it is a field of the **same** cell, so there is no second store for the
 * sidebar's visibility.
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

/** Persist the narrow window's visibility (M2.25); ⌘B in a narrow viewport writes this. */
export function setNarrowSidebarVisible(visible: boolean): void {
	const sidebar = getSettings().sidebar;
	if (sidebar.narrowVisible === visible) return;
	updateSettings({ sidebar: { ...sidebar, narrowVisible: visible } });
}

/**
 * ⌘B's action: the one toggle the keymap, the native menu and the palette all
 * call. On a narrow window it flips the **narrow** value, so an explicit toggle
 * shows the sidebar the width rule hid; on a wide window it flips the persisted
 * wide value (M2.25).
 */
export function toggleSidebar(): void {
	const sidebar = getSettings().sidebar;
	if (isNarrowViewport()) setNarrowSidebarVisible(!sidebar.narrowVisible);
	else setSidebarVisible(!sidebar.visible);
}
