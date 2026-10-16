import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import { getSettings } from "@/app/settings/store";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/constants/settings";
import { SIDEBAR_LABEL } from "@/constants/sidebar";
import { resetSettingsState } from "@/test/settings";
import { renderSidebar, SIDEBAR_SESSION, sidebarClient } from "@/test/sidebar";

/**
 * M2.7's drag-resize and ⌘B-visibility, through the real store: a pointer drag
 * writes through `setSidebarWidth` (which clamps), and the sidebar's width and
 * presence follow the persisted cell. The bound itself is asserted in
 * `sidebarActions.test.ts`; here it is the wire from a drag to the store.
 *
 * M2.25's narrow-window rule has its own suite (`Sidebar.visibility.test.tsx`),
 * because it is a different seam: the viewport, not the store.
 */

beforeEach(() => {
	resetSettingsState();
	navigate(sessionRoute(SIDEBAR_SESSION.id));
});
afterEach(cleanup);

describe("the sidebar", () => {
	test("a drag writes the width through the store, clamped to the bound", async () => {
		renderSidebar(sidebarClient());
		const handle = await screen.findByRole("separator");
		const aside = screen.getByLabelText(SIDEBAR_LABEL);

		// Drag left: 260 + 300 would be 560, so the store clamps to the maximum.
		fireEvent.pointerDown(handle, { clientX: 400 });
		fireEvent.pointerMove(window, { clientX: 100 });
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MAX_WIDTH);
		expect(aside.style.width).toBe(`${SIDEBAR_MAX_WIDTH}px`);
		fireEvent.pointerUp(window);

		// Drag right, past zero: the store clamps to the minimum.
		fireEvent.pointerDown(handle, { clientX: 100 });
		fireEvent.pointerMove(window, { clientX: 2_000 });
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MIN_WIDTH);
		expect(aside.style.width).toBe(`${SIDEBAR_MIN_WIDTH}px`);
		fireEvent.pointerUp(window);
	});

	test("⌘B's toggle hides and shows the sidebar", async () => {
		renderSidebar(sidebarClient());
		expect(await screen.findByLabelText(SIDEBAR_LABEL)).toBeDefined();
		act(() => toggleSidebar());
		expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull();
		act(() => toggleSidebar());
		expect(screen.getByLabelText(SIDEBAR_LABEL)).toBeDefined();
	});

	test("a child session gets no sidebar (spec 020 §Sidebar)", async () => {
		renderSidebar(sidebarClient({ ...SIDEBAR_SESSION, parentID: "ses_parent" }));
		// The panel read resolves asynchronously; wait for the child to be seen.
		await waitFor(() => expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull());
	});
});
