import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { sessionTab, settingsTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { TAB_DRAG_MIME, tabTitle } from "@/components/Tab";
import { TabStrip } from "@/components/TabStrip";
import { SETTINGS_TAB_LABEL } from "@/constants/tabs";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { fakeProbe } from "@/test/session";

const A = "ses_strip_a";
const B = "ses_strip_b";

afterEach(cleanup);
beforeEach(() => resetTabs());

describe("TabStrip", () => {
	test("middle-click closes a tab", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		render(
			<Providers>
				<TabStrip />
			</Providers>,
		);
		const tab = screen.getByText(B).closest('[role="tab"]') as HTMLElement;
		fireEvent(tab, new MouseEvent("auxclick", { bubbles: true, button: 1, cancelable: true }));
		expect(screen.queryByText(B)).toBeNull();
	});

	test("drag-reorder moves the tab", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		render(
			<Providers>
				<TabStrip />
			</Providers>,
		);
		const tabs = screen.getAllByRole("tab");
		const dataTransfer = new DataTransfer();
		dataTransfer.setData(TAB_DRAG_MIME, "0");
		fireEvent.dragOver(tabs[1], { dataTransfer });
		fireEvent.drop(tabs[1], { dataTransfer });
		const reordered = screen.getAllByRole("tab").map((el) => el.textContent);
		expect(reordered[0]).toContain(B);
		expect(reordered[1]).toContain(A);
	});

	test("escape closes the overflow menu", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		render(
			<Providers>
				<TabStrip />
			</Providers>,
		);
		const overflow = screen.getByTitle("All tabs");
		fireEvent.click(overflow);
		expect(screen.getByRole("menu")).toBeDefined();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu")).toBeNull();
	});

	test("clicking outside closes the overflow menu", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		render(
			<Providers>
				<TabStrip />
			</Providers>,
		);
		fireEvent.click(screen.getByTitle("All tabs"));
		expect(screen.getByRole("menu")).toBeDefined();
		fireEvent.mouseDown(document.body);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	test("a session tab shows the held title", async () => {
		openTab(sessionTab(A));
		renderStripWithSessions([{ id: A, title: "Chrome work", parentID: undefined }]);
		await flush();
		expect(screen.getByText("Chrome work")).toBeDefined();
		expect(screen.queryByText(A)).toBeNull();
	});

	test("an untitled or unheld session falls back to the id", async () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		renderStripWithSessions([{ id: A, title: "  ", parentID: undefined }]);
		await flush();
		expect(screen.getByText(A)).toBeDefined();
		expect(screen.getByText(B)).toBeDefined();
	});

	test("tabTitle prefers the held title and keeps the settings label", () => {
		const titles = new Map([[A, "Chrome work"]]);
		expect(tabTitle(sessionTab(A), titles)).toBe("Chrome work");
		expect(tabTitle(sessionTab(B), titles)).toBe(B);
		expect(tabTitle(sessionTab(A))).toBe(A);
		expect(tabTitle(settingsTab(), titles)).toBe(SETTINGS_TAB_LABEL);
	});
});

function renderStripWithSessions(sessions: unknown[]) {
	const client = {
		session: { list: () => Promise.resolve({ data: sessions }) },
		server: { info: () => Promise.resolve({ version: "2.0.29" }) },
	};
	const probe = fakeProbe("resolve");
	return render(
		<ClientProvider client={client as never} probe={probe.run}>
			<TabStrip />
		</ClientProvider>,
	);
}
