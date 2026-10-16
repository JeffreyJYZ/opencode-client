import { describe, expect, test } from "bun:test";
import {
	appMenuItems,
	panelMenuItems,
	recentsMenuItems,
	tabMenuItems,
	transcriptMenuItems,
} from "@/components/contextmenu/surfaceItems";
import { KEYBOARD_SHORTCUTS, SHORTCUT_INTERRUPT } from "@/constants/keys";
import {
	MENU_ELEMENT_ROUTE_HINT,
	MENU_INTERRUPT_IDLE_HINT,
	MENU_OPEN_SESSION_ID,
} from "@/constants/menu";
import { TAB_KIND } from "@/constants/tabs";

/**
 * The four surfaces' lists are the **registry's** rows, not a second map (M5.1
 * requirement 2): an item's words are the binding's own description and label, so a
 * menu cannot print a chord the app does not match, and a new chord lands in every
 * menu that names it without a second edit. That is the invariant this file holds.
 */

const registry = new Map(KEYBOARD_SHORTCUTS.map((binding) => [binding.id, binding]));

function everyList() {
	return [
		appMenuItems(),
		tabMenuItems({ kind: TAB_KIND.session, id: "ses_1" }),
		recentsMenuItems("ses_1"),
		transcriptMenuItems({ client: null, sessionID: "ses_1", running: true }),
		panelMenuItems(),
	];
}

describe("the surfaces' item lists", () => {
	test("every bound item is the registry row it names", () => {
		let bound = 0;
		for (const list of everyList()) {
			for (const item of list) {
				if (item.id === MENU_OPEN_SESSION_ID) continue;
				const binding = registry.get(item.id);
				if (binding === undefined) throw new Error(`no registry row for ${item.id}`);
				expect(item.label).toBe(binding.description);
				expect(item.accelerator).toBe(binding.label);
				bound++;
			}
		}
		expect(bound).toBeGreaterThan(0);
	});

	test("no item is silent about how the keyboard reaches it", () => {
		for (const list of everyList()) {
			for (const item of list) expect(item.accelerator).toBeTruthy();
		}
	});

	test("the one unbound item names the element's own route", () => {
		const open = recentsMenuItems("ses_1")[0];
		expect(open?.id).toBe(MENU_OPEN_SESSION_ID);
		expect(open?.accelerator).toBe(MENU_ELEMENT_ROUTE_HINT);
	});

	test("every surface ends with the app-wide tail, so each menu is keyboard-reachable", () => {
		const tail = appMenuItems().map((item) => item.id);
		expect(tail.length).toBeGreaterThan(0);
		for (const list of everyList()) {
			expect(list.slice(-tail.length).map((item) => item.id)).toEqual(tail);
		}
	});

	test("the interrupt item keeps its place and chord while idle, and says why", () => {
		const [idle] = transcriptMenuItems({ client: null, sessionID: "ses_1", running: false });
		expect(idle?.id).toBe(SHORTCUT_INTERRUPT.id);
		expect(idle?.accelerator).toBe(SHORTCUT_INTERRUPT.label);
		expect(idle?.disabled).toBe(true);
		expect(idle?.disabledHint).toBe(MENU_INTERRUPT_IDLE_HINT);
		const [live] = transcriptMenuItems({ client: null, sessionID: "ses_1", running: true });
		expect(live?.disabled).toBe(false);
	});
});
