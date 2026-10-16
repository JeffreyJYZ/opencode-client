import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getTabSnapshot, openTab, resetTabs } from "@/app/tabs";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { Tab } from "@/components/Tab";
import {
	SHORTCUT_CLOSE_OTHERS,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";
import { CONTEXT_MENU_LABEL } from "@/constants/menu";
import { ROUTE_PATH, SESSION_PATH_PREFIX } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";
import { RecentsRow } from "@/pages/RecentsRow";
import type { SessionRow } from "@/session/useSessions";

/**
 * The chrome surfaces' menu call sites (M5.1 requirement 1): a tab, a recents row and
 * a sidebar panel each open the one primitive, list their own items, and get focus
 * back on Escape. Chords are asserted against the **registry's own labels**, so a menu
 * that printed a chord the app does not match fails here rather than in front of a
 * user; an item's effect is asserted where its action lands (the tab store, the
 * route), never on a prop the menu is not wired to.
 */

beforeEach(() => {
	resetTabs();
	window.history.pushState(null, "", ROUTE_PATH.home);
});

afterEach(() => {
	cleanup();
	resetTabs();
});

const SESSION = {
	id: "ses_1",
	title: "Chrome work",
	location: { directory: "/tmp/m51-project" },
	time: { created: 1, updated: Date.now() },
} as unknown as SessionRow;

const TAB = { kind: TAB_KIND.session, id: "ses_1" } as const;

function noop(): void {}

function menu(): HTMLElement {
	return screen.getByRole("menu", { name: CONTEXT_MENU_LABEL });
}

/** The accelerator a menu prints for the item with this label. */
function acceleratorFor(label: string): string | null {
	const item = screen.getByRole("menuitem", { name: new RegExp(label) });
	return item.querySelector("span:last-child")?.textContent ?? null;
}

describe("a tab's context menu", () => {
	function renderTab(): HTMLElement {
		render(
			<Tab
				tab={TAB}
				index={0}
				active
				running={false}
				unread={false}
				onActivate={noop}
				onClose={noop}
				onMove={noop}
			/>,
		);
		return screen.getByRole("tab");
	}

	/** Open the tab's menu and activate the item with this label. */
	function activate(label: string): void {
		renderTab();
		fireEvent.contextMenu(screen.getByRole("tab"));
		fireEvent.click(screen.getByRole("menuitem", { name: new RegExp(label) }));
	}

	test("a right-click opens it with the tab's own actions and the app's tail", () => {
		renderTab();
		fireEvent.contextMenu(screen.getByRole("tab"));
		expect(menu()).toBeDefined();
		expect(acceleratorFor(SHORTCUT_CLOSE_TAB.description)).toBe(SHORTCUT_CLOSE_TAB.label);
		expect(acceleratorFor(SHORTCUT_CLOSE_OTHERS.description)).toBe(SHORTCUT_CLOSE_OTHERS.label);
		expect(acceleratorFor(SHORTCUT_COMMAND_PALETTE.description)).toBe(
			SHORTCUT_COMMAND_PALETTE.label,
		);
		expect(acceleratorFor(SHORTCUT_SETTINGS.description)).toBe(SHORTCUT_SETTINGS.label);
	});

	test("⇧F10 on the focused tab opens the same menu", () => {
		const tab = renderTab();
		fireEvent.keyDown(tab, { key: "F10", shiftKey: true });
		expect(menu()).toBeDefined();
	});

	test("closing an item is the ⌘W action: the tab leaves the strip", () => {
		openTab(TAB);
		activate(SHORTCUT_CLOSE_TAB.description);
		expect(getTabSnapshot().tabs).toEqual([]);
	});

	test("close-others is the ⌘⌥W action: only the menu's own tab survives", () => {
		openTab({ kind: TAB_KIND.session, id: "ses_other" });
		openTab(TAB);
		activate(SHORTCUT_CLOSE_OTHERS.description);
		expect(getTabSnapshot().tabs).toEqual([TAB]);
	});

	test("Escape closes it and puts focus back on the tab that opened it", () => {
		const tab = renderTab();
		fireEvent.contextMenu(tab);
		expect(document.activeElement).not.toBe(tab);
		fireEvent.keyDown(menu(), { key: "Escape" });
		expect(screen.queryByRole("menu")).toBeNull();
		expect(document.activeElement).toBe(tab);
	});
});

describe("a recents row's context menu", () => {
	test("Open is the row's own route, and running it opens that session", () => {
		render(<RecentsRow session={SESSION} openSession={noop} />);
		fireEvent.contextMenu(screen.getByRole("button", { name: /Chrome work/ }));
		expect(acceleratorFor("Open")).toBe("Enter");
		fireEvent.click(screen.getByRole("menuitem", { name: /Open/ }));
		expect(getTabSnapshot().tabs).toEqual([TAB]);
		expect(window.location.pathname).toBe(`${SESSION_PATH_PREFIX}${SESSION.id}`);
	});
});

describe("a panel's context menu", () => {
	test("the panel's own item is the sidebar toggle, with the registry's chord", () => {
		render(<SidebarPanel title="Session">nothing</SidebarPanel>);
		fireEvent.contextMenu(screen.getByLabelText("Session"));
		expect(acceleratorFor(SHORTCUT_TOGGLE_SIDEBAR.description)).toBe(
			SHORTCUT_TOGGLE_SIDEBAR.label,
		);
	});
});
