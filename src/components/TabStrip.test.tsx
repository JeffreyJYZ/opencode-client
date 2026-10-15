import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { TAB_DRAG_MIME } from "@/components/Tab";
import { TabStrip } from "@/components/TabStrip";

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
});
