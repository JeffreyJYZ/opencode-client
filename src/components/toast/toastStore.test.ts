import { afterEach, describe, expect, test } from "bun:test";
import {
	dismissToast,
	getToasts,
	pushToast,
	resetToasts,
	subscribeToasts,
} from "@/components/toast/toastStore";
import { TOAST_ROLE } from "@/constants/native";

/**
 * The toast store (M5.2): one module-level list any module can speak through. Its
 * contract is what `useSyncExternalStore` needs — a **new** snapshot per change, so an
 * unchanged read is referentially equal and a change is never missed.
 */

afterEach(resetToasts);

describe("the toast store", () => {
	test("a push is a new snapshot and notifies every listener", () => {
		const lengths: number[] = [];
		const stop = subscribeToasts(() => lengths.push(getToasts().length));
		const before = getToasts();
		const id = pushToast("hello", TOAST_ROLE.alert);
		expect(getToasts()).not.toBe(before);
		expect(getToasts()).toEqual([{ id, role: TOAST_ROLE.alert, message: "hello" }]);
		expect(lengths).toEqual([1]);
		stop();
		pushToast("after unsubscribe");
		expect(lengths).toEqual([1]);
	});

	test("dismiss removes exactly the id it names", () => {
		const first = pushToast("one");
		pushToast("two");
		dismissToast(first);
		expect(getToasts().map((toast) => toast.message)).toEqual(["two"]);
	});

	test("the default role is a status, and reset clears everything", () => {
		pushToast("plain");
		expect(getToasts()[0]?.role).toBe(TOAST_ROLE.status);
		resetToasts();
		expect(getToasts()).toHaveLength(0);
	});
});
