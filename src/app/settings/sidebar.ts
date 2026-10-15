import { DEFAULT_SIDEBAR, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/constants/settings";

/**
 * The sidebar cell of the settings blob (spec 010 §Persistence: `settings.sidebar`
 * is "visible + width"). Pure, so both the read path (`model.ts`) and the write
 * path (`sidebarActions.ts`) enforce **one** bound — the resize cannot escape it
 * by writing a width the reader would then clamp back.
 */

export type SidebarState = {
	readonly visible: boolean;
	readonly width: number;
};

/**
 * The bound, in the store. A drag hands a raw pixel width here; the reader
 * (`normalizeSidebar`) applies the same clamp, so a hand-edited blob and a live
 * drag agree and a resize survives a reload at the width the bound allows.
 */
export function clampSidebarWidth(width: number): number {
	if (!Number.isFinite(width)) return DEFAULT_SIDEBAR.width;
	return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

/** The stored cell, defensive: a blob is user-writable state on disk. */
export function normalizeSidebar(raw: unknown): SidebarState {
	const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
	const width = record.width;
	return {
		visible: typeof record.visible === "boolean" ? record.visible : DEFAULT_SIDEBAR.visible,
		width: typeof width === "number" ? clampSidebarWidth(width) : DEFAULT_SIDEBAR.width,
	};
}
