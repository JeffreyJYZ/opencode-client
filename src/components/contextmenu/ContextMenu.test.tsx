import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { boundItem, type MenuItem } from "@/components/contextmenu/menuItems";
import {
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";
import { CONTEXT_MENU_LABEL, MENU_BACKDROP_ATTR, MENU_EDGE_GUTTER_PX } from "@/constants/menu";

/**
 * The primitive (M5.1 requirement 1): focus, arrow keys, dismissal and clamping,
 * driven through the DOM the way a keyboard user reaches it.
 *
 * Activating an item is a `click`, because a `click` is what `Enter` on a focused
 * `<button>` produces in a browser; happy-dom does not synthesise one from a
 * keydown. The keypress itself is the browser proof's, not this file's.
 */

afterEach(cleanup);

/** A point outside the viewport, so the clamp is what decides the position. */
const AT = { x: -40, y: -40 };

const FIRST = SHORTCUT_COMMAND_PALETTE.description;
const SECOND = SHORTCUT_SETTINGS.description;

function items(calls: string[]): MenuItem[] {
	return [
		boundItem(SHORTCUT_COMMAND_PALETTE, () => calls.push("palette")),
		boundItem(SHORTCUT_SETTINGS, () => calls.push("settings")),
		boundItem(SHORTCUT_TOGGLE_SIDEBAR, () => calls.push("sidebar"), {
			disabled: true,
			disabledHint: "not now",
		}),
	];
}

function open(calls: string[] = []): { calls: string[]; container: HTMLElement } {
	const { container } = render(
		<ContextMenu items={items(calls)} at={AT} onClose={() => calls.push("close")} />,
	);
	return { calls, container };
}

function menu(): HTMLElement {
	return screen.getByRole("menu", { name: CONTEXT_MENU_LABEL });
}

describe("ContextMenu", () => {
	test("it opens as a named menu with the first reachable item focused", () => {
		open();
		expect(menu()).toBeDefined();
		expect(document.activeElement?.textContent).toContain(FIRST);
	});

	test("a disabled item keeps its place and its hint, and is not a stop", () => {
		open();
		const disabled = screen.getByRole("menuitem", {
			name: new RegExp(SHORTCUT_TOGGLE_SIDEBAR.description),
		});
		expect((disabled as HTMLButtonElement).disabled).toBe(true);
		expect(disabled.getAttribute("title")).toBe("not now");
		// Down twice: the third item is disabled, so the second is still the floor.
		fireEvent.keyDown(menu(), { key: "ArrowDown" });
		fireEvent.keyDown(menu(), { key: "ArrowDown" });
		expect(document.activeElement?.textContent).toContain(SECOND);
	});

	test("the arrows move one item and stop at both ends", () => {
		open();
		fireEvent.keyDown(menu(), { key: "ArrowUp" });
		expect(document.activeElement?.textContent).toContain(FIRST);
		fireEvent.keyDown(menu(), { key: "ArrowDown" });
		expect(document.activeElement?.textContent).toContain(SECOND);
	});

	test("activating an item closes the menu first, then runs it", () => {
		const { calls } = open();
		fireEvent.click(screen.getByRole("menuitem", { name: new RegExp(SECOND) }));
		expect(calls).toEqual(["close", "settings"]);
	});

	test("Escape closes without activating anything", () => {
		const { calls } = open();
		fireEvent.keyDown(menu(), { key: "Escape" });
		expect(calls).toEqual(["close"]);
	});

	test("the menu's own Escape does not read as the interrupt chord", () => {
		open();
		// `preventDefault` is what stops the event reaching the window handlers.
		expect(fireEvent.keyDown(menu(), { key: "Escape" })).toBe(false);
	});

	test("a click outside lands on the backdrop, so the surface below never sees it", () => {
		const { calls, container } = open();
		const backdrop = container.querySelector(`[${MENU_BACKDROP_ATTR}]`);
		expect(backdrop).not.toBeNull();
		fireEvent.mouseDown(backdrop as Element);
		expect(calls).toEqual(["close"]);
	});

	test("Tab is held inside the menu", () => {
		open();
		fireEvent.keyDown(menu(), { key: "ArrowDown" });
		expect(document.activeElement?.textContent).toContain(SECOND);
		// From the last reachable item, Tab wraps to the first rather than leaving.
		expect(fireEvent.keyDown(document, { key: "Tab" })).toBe(false);
		expect(document.activeElement?.textContent).toContain(FIRST);
	});

	test("a point outside the viewport is clamped by the named gutter", () => {
		open();
		expect(menu().style.left).toBe(`${MENU_EDGE_GUTTER_PX}px`);
		expect(menu().style.top).toBe(`${MENU_EDGE_GUTTER_PX}px`);
	});
});
