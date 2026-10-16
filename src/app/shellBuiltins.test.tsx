import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { disposeShellBuiltins, registerShellBuiltins } from "@/app/shellBuiltins";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { Slot } from "@/components/Slot";
import { SHELL_CONTRIBUTION_ID } from "@/constants/plugins";
import { ROUTE_PATH } from "@/constants/routes";
import { SLOT_LOCKED } from "@/constants/slots";
import { APP_MARK_LABEL, SETTINGS_GEAR_LABEL } from "@/constants/tabs";
import { clearFaults } from "@/plugins/faults";
import { getSlotContributions } from "@/plugins/registry";
import { resetSettingsState } from "@/test/settings";

/**
 * The shell's place (M4.17, spec 040 §Model): `app.substrate` hosts the shell,
 * the way any slot hosts its contributors — through `register` with the
 * substrate as its actor, rendered by `<Slot id="app.substrate">` at the root
 * (`main.tsx`). The proof is the frame itself: **empty** when the registration
 * is absent, normal — same components, same order — when present, and exactly
 * one registration however often the boot path calls it.
 */

/** The root composition: the providers wrap, the locked slot hosts, nothing else. */
function Substrate() {
	return (
		<Providers>
			<Slot id={SLOT_LOCKED.substrate} />
		</Providers>
	);
}

afterEach(cleanup);

beforeEach(() => {
	resetSettingsState();
	clearFaults();
	window.history.pushState(null, "", ROUTE_PATH.home);
	registerTopnavBuiltins();
});

afterEach(() => {
	disposeShellBuiltins();
	disposeTopnavBuiltins();
	clearFaults();
});

describe("the app.substrate slot", () => {
	test("hosts the shell, through the same register a plugin writes to", () => {
		registerShellBuiltins();
		render(<Substrate />);
		expect(getSlotContributions(SLOT_LOCKED.substrate).map((entry) => entry.id)).toEqual([
			SHELL_CONTRIBUTION_ID,
		]);
		// The frame is the normal one: the nav's built-ins and the home switch.
		expect(screen.getByText(APP_MARK_LABEL)).toBeDefined();
		expect(screen.getByText("Recents")).toBeDefined();
		expect(screen.getByText(SETTINGS_GEAR_LABEL)).toBeDefined();
	});

	test("a second registration call is absorbed, never a duplicate shell", () => {
		registerShellBuiltins();
		registerShellBuiltins();
		render(<Substrate />);
		expect(getSlotContributions(SLOT_LOCKED.substrate)).toHaveLength(1);
		// The single `<nav>` proves exactly one Shell was mounted.
		expect(document.querySelectorAll('[aria-label="Views"]')).toHaveLength(1);
	});

	test("the frame is empty when the substrate registration is absent", () => {
		// No registration call: the slot renders nothing at all — the one state a
		// locked disable must never produce by accident.
		const { container } = render(<Substrate />);
		expect(getSlotContributions(SLOT_LOCKED.substrate)).toHaveLength(0);
		expect(container.innerHTML).toBe("");
		expect(screen.queryByText(APP_MARK_LABEL)).toBeNull();
		expect(screen.queryByText("Recents")).toBeNull();
	});
});
