import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Slot } from "@/components/Slot";
import type { Disposable } from "@/plugins/disposable";
import { clearFaults, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { register } from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";

/** A slot from the tuple; which member it is does not matter to these tests. */
const TEST_SLOT: SlotName = "home.hero";

/** A name that is deliberately not in the tuple. */
const UNKNOWN_SLOT = "m04.slot.test.unknown";

/** RTL installs auto-cleanup once per process; every later importer needs its own. */
afterEach(cleanup);

/** Every handle a test opened, disposed after it, so no file leaks into the next. */
const open: Disposable[] = [];

function track(disposable: Disposable): Disposable {
	open.push(disposable);
	return disposable;
}

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
});

beforeEach(() => {
	clearFaults();
});

describe("Slot", () => {
	test("renders what is registered for it, in registration order", () => {
		track(
			register({
				id: "m04-slot-first",
				slot: TEST_SLOT,
				component: () => <span>first</span>,
				order: 1,
			}),
		);
		track(
			register({
				id: "m04-slot-second",
				slot: TEST_SLOT,
				component: () => <span>second</span>,
				order: 2,
			}),
		);
		const { container } = render(<Slot id={TEST_SLOT} />);
		expect(screen.getByText("first")).toBeDefined();
		expect(container.textContent).toBe("firstsecond");
	});

	test("an empty slot renders nothing at all", () => {
		const { container } = render(<Slot id={TEST_SLOT} />);
		expect(container.childNodes).toHaveLength(0);
		expect(container.innerHTML).toBe("");
	});

	test("an unknown slot renders nothing and records a fault, without throwing", () => {
		const { container } = render(<Slot id={UNKNOWN_SLOT as SlotName} />);
		expect(container.innerHTML).toBe("");
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.unknownSlot);
	});

	test("drop a contribution and the slot stops rendering it", () => {
		track(
			register({ id: "m04-slot-kept", slot: TEST_SLOT, component: () => <span>kept</span> }),
		);
		const removed = track(
			register({
				id: "m04-slot-removed",
				slot: TEST_SLOT,
				component: () => <span>removed</span>,
			}),
		);
		const { queryByText } = render(<Slot id={TEST_SLOT} />);
		expect(queryByText("kept")).toBeDefined();
		expect(queryByText("removed")).toBeDefined();
		act(() => removed.dispose());
		expect(queryByText("removed")).toBeNull();
		expect(queryByText("kept")).toBeDefined();
	});
});
