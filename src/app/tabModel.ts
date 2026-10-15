import { TAB_KIND } from "@/constants/tabs";

/**
 * The tab model: a tab is a *view*, not only a session. The settings view is
 * one tab while it is open, and never more than one.
 */

export type Tab =
	| { readonly kind: typeof TAB_KIND.session; readonly id: string }
	| { readonly kind: typeof TAB_KIND.settings };

export type TabSnapshot = {
	readonly tabs: readonly Tab[];
	/** `-1` when the strip is empty. */
	readonly activeIndex: number;
	/** `tabKey`s that produced output while unfocused, until visited. */
	readonly unread: ReadonlySet<string>;
};

/** The unread key of a tab: the session id, or the settings view. */
export function tabKey(tab: Tab): string {
	return tab.kind === TAB_KIND.settings ? TAB_KIND.settings : tab.id;
}

export function sessionTab(id: string): Tab {
	return { kind: TAB_KIND.session, id };
}

export function settingsTab(): Tab {
	return { kind: TAB_KIND.settings };
}

export function sameTab(a: Tab, b: Tab): boolean {
	return a.kind === b.kind && (a.kind === TAB_KIND.settings || a.id === (b as { id: string }).id);
}

/** The M1.5 seam: the blob shape, without the storage. */
export type SerializedTabs = {
	readonly tabs: readonly Tab[];
	readonly activeIndex: number;
};
