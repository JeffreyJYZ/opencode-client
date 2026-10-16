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
	MENU_COPY_EMPTY_HINT,
	MENU_COPY_ID,
	MENU_EDITOR_ID,
	MENU_EDITOR_NO_TARGET_HINT,
	MENU_ELEMENT_ROUTE_HINT,
	MENU_INTERRUPT_IDLE_HINT,
	MENU_OPEN_SESSION_ID,
} from "@/constants/menu";
import { TAB_KIND } from "@/constants/tabs";
import { ROW_KIND, TOOL_STATUS } from "@/constants/transcript";
import { capPayload } from "@/session/payloadCaps";
import type { ToolRow } from "@/session/transcript";

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
				// The unbound items (the recents row, a row's Copy and Open-in-editor)
				// name no binding: their route is the element's own key, held below.
				if (item.binding === undefined) continue;
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

	test("an item with no binding names the element's own route", () => {
		let unbound = 0;
		for (const list of everyList()) {
			for (const item of list) {
				if (item.binding !== undefined) continue;
				expect(item.accelerator).toBe(MENU_ELEMENT_ROUTE_HINT);
				unbound++;
			}
		}
		expect(unbound).toBeGreaterThan(0);
	});

	test("the recents row's one item is the unbound open", () => {
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

	/**
	 * A transcript row's two native affordances (M5.2). The region's own menu has no
	 * row, so both keep their place and say why, and a tool row with a text and an
	 * absolute anchor enables both — the item is inert rather than absent either way.
	 */
	describe("a row's copy and open-in-editor items", () => {
		const read = (input: string, anchor?: string): ToolRow => ({
			id: "msg_a:t0",
			created: 1,
			seq: 1,
			kind: ROW_KIND.tool,
			name: "read",
			input,
			status: TOOL_STATUS.ok,
			output: capPayload(""),
			...(anchor === undefined ? {} : { anchor }),
		});

		test("the region's own menu shows both inert, each with its reason", () => {
			const items = transcriptMenuItems({ client: null, sessionID: "ses_1", running: false });
			const copy = items.find((item) => item.id === MENU_COPY_ID);
			const editor = items.find((item) => item.id === MENU_EDITOR_ID);
			expect(copy?.disabled).toBe(true);
			expect(copy?.disabledHint).toBe(MENU_COPY_EMPTY_HINT);
			expect(editor?.disabled).toBe(true);
			expect(editor?.disabledHint).toBe(MENU_EDITOR_NO_TARGET_HINT);
		});

		test("a tool row with text and an absolute anchor enables both", () => {
			const items = transcriptMenuItems({
				client: null,
				sessionID: "ses_1",
				running: false,
				row: read('{"path":"/a.ts"}', "/a.ts"),
			});
			expect(items.find((item) => item.id === MENU_COPY_ID)?.disabled).toBe(false);
			expect(items.find((item) => item.id === MENU_EDITOR_ID)?.disabled).toBe(false);
		});
	});
});
