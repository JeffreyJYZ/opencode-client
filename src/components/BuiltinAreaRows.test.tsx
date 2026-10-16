import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { disposeShellBuiltins, registerShellBuiltins } from "@/app/shellBuiltins";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { BuiltinAreaRows } from "@/components/BuiltinAreaRows";
import { PluginsSection } from "@/components/PluginsSection";
import { Slot } from "@/components/Slot";
import {
	PLUGINS_BUILTIN_AREA_NOTE,
	PLUGINS_BUILTIN_AREAS_LABEL,
	PLUGINS_BUILTIN_ROW,
	PLUGINS_FAULT_COUNT,
} from "@/constants/pluginManager";
import { ROUTE_PATH } from "@/constants/routes";
import { SLOT_LOCKED } from "@/constants/slots";
import { APP_MARK_LABEL } from "@/constants/tabs";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { getPluginsSnapshot } from "@/plugins/manager";
import { getSlotContributions } from "@/plugins/registry";
import { LOCKED_SLOTS } from "@/plugins/slots";
import { resetSettingsState } from "@/test/settings";

/**
 * The manager's built-in rows (M4.17, spec 040 §Model): every locked area is a
 * row labelled built-in, and a disable click on one is **refused** — a
 * locked-area fault naming the area, no loader call, no enabled record, no
 * registry change. The area persists after, because `app.substrate` is the
 * app: without it there is no window to recover into, which is the one outcome
 * a user could not undo.
 */

afterEach(cleanup);

beforeEach(() => {
	resetSettingsState();
	clearFaults();
	registerTopnavBuiltins();
});

afterEach(() => {
	disposeShellBuiltins();
	disposeTopnavBuiltins();
	clearFaults();
});

const rowFor = (area: string): HTMLElement =>
	document.querySelector(`[data-builtin-area="${area}"]`) as HTMLElement;
const disableButton = (area: string): HTMLElement =>
	rowFor(area).querySelector('[data-area-action="disable"]') as HTMLButtonElement;

describe("the built-in rows", () => {
	test("one row per locked area, labelled built-in", () => {
		render(<BuiltinAreaRows />);
		expect(screen.getByText(PLUGINS_BUILTIN_AREAS_LABEL)).toBeDefined();
		for (const area of LOCKED_SLOTS) {
			expect(rowFor(area)).toBeTruthy();
			expect(rowFor(area).textContent).toContain(PLUGINS_BUILTIN_ROW);
			expect(rowFor(area).textContent).toContain(PLUGINS_BUILTIN_AREA_NOTE);
			expect(disableButton(area)).toBeTruthy();
		}
	});

	test("a disable attempt on the substrate is refused and names the area", () => {
		registerShellBuiltins();
		render(<BuiltinAreaRows />);
		const before = [...getSlotContributions(SLOT_LOCKED.substrate)];
		const snapshotBefore = getPluginsSnapshot();
		fireEvent.click(disableButton(SLOT_LOCKED.substrate));
		const fault = listFaults().at(-1);
		expect(fault?.reason).toBe(FAULT_REASONS.lockedArea);
		expect(fault?.area).toBe(FAULT_AREAS.slots);
		expect(fault?.subject).toBe(SLOT_LOCKED.substrate);
		expect(fault?.message).toContain(SLOT_LOCKED.substrate);
		// Nothing was acted on: the shell contribution reads back unchanged, and
		// the manager snapshot — installed records and running ids both — is the
		// same snapshot the click found.
		expect([...getSlotContributions(SLOT_LOCKED.substrate)]).toEqual(before);
		expect(getPluginsSnapshot().installed).toEqual(snapshotBefore.installed);
		expect(getPluginsSnapshot().loaded).toEqual(snapshotBefore.loaded);
		// The rows are still there, both of them.
		expect(rowFor(SLOT_LOCKED.substrate)).toBeTruthy();
		expect(rowFor(SLOT_LOCKED.builtins)).toBeTruthy();
	});

	test("a disable attempt on the grouping is refused and names the area", () => {
		registerShellBuiltins();
		render(<BuiltinAreaRows />);
		fireEvent.click(disableButton(SLOT_LOCKED.builtins));
		const fault = listFaults().at(-1);
		expect(fault?.reason).toBe(FAULT_REASONS.lockedArea);
		expect(fault?.subject).toBe(SLOT_LOCKED.builtins);
	});

	test("the shell still renders after the refusal: the app is unchanged", () => {
		window.history.pushState(null, "", ROUTE_PATH.home);
		registerShellBuiltins();
		render(<BuiltinAreaRows />);
		fireEvent.click(disableButton(SLOT_LOCKED.substrate));
		// Re-mount the substrate slot the way the root does: the normal frame is
		// still there — the refusal retracted nothing, not even the registration.
		render(
			<Providers>
				<Slot id={SLOT_LOCKED.substrate} />
			</Providers>,
		);
		expect(screen.getByText(APP_MARK_LABEL)).toBeDefined();
		expect(screen.getByText("Recents")).toBeDefined();
		expect(getSlotContributions(SLOT_LOCKED.substrate)).toHaveLength(1);
	});
});

// The section view: the refused attempt's fault is visible where the manager
// renders the faults it cannot put on an installed plugin's row.
describe("the section", () => {
	test("surfaces the refused disable in the default fault count and list", () => {
		registerShellBuiltins();
		render(<PluginsSection />);
		fireEvent.click(disableButton(SLOT_LOCKED.substrate));
		expect(document.querySelector("[data-plugin-fault-count]")?.textContent).toBe(
			PLUGINS_FAULT_COUNT(1),
		);
		const fault = document.querySelector('[data-plugin-fault="locked-area"]');
		expect(fault?.textContent).toContain(SLOT_LOCKED.substrate);
	});
});
