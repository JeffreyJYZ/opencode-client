import { describe, expect, test } from "bun:test";
import { shouldNotifyTurnEnd } from "@/app/turnEndNotification";

/**
 * The turn-end notification's **decision** (M5.2, requirement 4). It is pure, so both
 * halves of the rule — the turn really ended, and the window was unfocused at that
 * moment — are proven here without a window; the live half (a real notification on the
 * user's screen) is the only thing a script cannot hold.
 */

describe("shouldNotifyTurnEnd", () => {
	test("a turn that ended while the window was unfocused notifies", () => {
		expect(shouldNotifyTurnEnd({ wasRunning: true, running: false, focused: false })).toBe(
			true,
		);
	});

	test("a turn that ended while the window was focused does not", () => {
		expect(shouldNotifyTurnEnd({ wasRunning: true, running: false, focused: true })).toBe(
			false,
		);
	});

	test("no change that is not a turn ending notifies, focused or not", () => {
		// A turn *starting* is the opposite of one that ended.
		expect(shouldNotifyTurnEnd({ wasRunning: false, running: true, focused: false })).toBe(
			false,
		);
		// A re-render while already idle: nothing ended here.
		expect(shouldNotifyTurnEnd({ wasRunning: false, running: false, focused: false })).toBe(
			false,
		);
		// Still running, merely unfocused: nothing has ended yet.
		expect(shouldNotifyTurnEnd({ wasRunning: true, running: true, focused: false })).toBe(
			false,
		);
	});
});
