import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { setSidebarVisible, toggleSidebar } from "@/app/settings/sidebarActions";
import { getSettings } from "@/app/settings/store";
import { SIDEBAR_LABEL } from "@/constants/sidebar";
import { resetSettingsState } from "@/test/settings";
import { renderSidebar, SIDEBAR_SESSION, sidebarClient, stubViewport } from "@/test/sidebar";

/**
 * M2.25's acceptance (spec 020 §Sidebar's visibility rule): a narrow viewport
 * hides the sidebar **unless it was explicitly toggled open in that state**, and
 * ⌘B keeps toggling it there. The viewport is driven through the seam the panel
 * reads — `window.matchMedia` — never by faking a style and asserting on it.
 */

beforeEach(() => {
	resetSettingsState();
	navigate(sessionRoute(SIDEBAR_SESSION.id));
});
afterEach(cleanup);

describe("the sidebar's narrow-window rule", () => {
	test("a narrow viewport hides the sidebar even when the persisted flag is open", async () => {
		const viewport = stubViewport(true);
		try {
			act(() => setSidebarVisible(true));
			renderSidebar(sidebarClient());
			// The panel read resolves asynchronously; waiting absorbs its update.
			await waitFor(() => expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull());
		} finally {
			viewport.restore();
		}
	});

	test("⌘B in a narrow viewport brings the sidebar back", async () => {
		const viewport = stubViewport(true);
		try {
			renderSidebar(sidebarClient());
			expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull();
			act(() => toggleSidebar());
			await waitFor(() => expect(screen.getByLabelText(SIDEBAR_LABEL)).toBeDefined());
			// The narrow value is what persisted, so a restart on a narrow window keeps it.
			expect(getSettings().sidebar.narrowVisible).toBe(true);
		} finally {
			viewport.restore();
		}
	});

	test("a wide viewport honours the persisted flag", async () => {
		const viewport = stubViewport(false);
		try {
			act(() => setSidebarVisible(false));
			renderSidebar(sidebarClient());
			expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull();
			act(() => setSidebarVisible(true));
			expect(await screen.findByLabelText(SIDEBAR_LABEL)).toBeDefined();
		} finally {
			viewport.restore();
		}
	});

	test("a resize across the breakpoint hides the sidebar", async () => {
		const viewport = stubViewport(false);
		try {
			renderSidebar(sidebarClient());
			expect(await screen.findByLabelText(SIDEBAR_LABEL)).toBeDefined();
			act(() => viewport.set(true));
			expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull();
		} finally {
			viewport.restore();
		}
	});
});
