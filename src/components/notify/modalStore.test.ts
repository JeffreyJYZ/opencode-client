import { afterEach, describe, expect, test } from "bun:test";
import {
	getModals,
	MODAL_KIND,
	pushModal,
	requestConfirm,
	resetModals,
	resolveModal,
	subscribeModals,
} from "@/components/notify/modalStore";

/**
 * The modal store (M4.20): a queue a plugin speaks through, and the one place a
 * `confirm` is answered. The load-bearing contract is that `resolveModal` resolves
 * the answer it is given — a hard-wired `false` cannot be told from a user
 * cancelling, which is exactly the defect this row closes.
 */

afterEach(resetModals);

/** The head's id, or a failure — never a cast a wrong shape could slip through. */
function headId(): number {
	const head = getModals()[0];
	if (head === undefined) throw new Error("no modal request to resolve");
	return head.id;
}

describe("the modal store", () => {
	test("a notice is a new snapshot and notifies every listener", () => {
		const lengths: number[] = [];
		const stop = subscribeModals(() => lengths.push(getModals().length));
		const id = pushModal("hello");
		expect(getModals()).toEqual([{ id, kind: MODAL_KIND.notice, message: "hello" }]);
		expect(lengths).toEqual([1]);
		stop();
	});

	test("a confirm resolves the answer the user gave", async () => {
		const answer = requestConfirm("sure?");
		expect(getModals()[0]?.kind).toBe(MODAL_KIND.confirm);
		resolveModal(headId(), true);
		expect(await answer).toBe(true);
		expect(getModals()).toHaveLength(0);
	});

	test("a refusal resolves false", async () => {
		const answer = requestConfirm("one?");
		resolveModal(headId(), false);
		expect(await answer).toBe(false);
	});

	test("reset resolves a pending confirm false, so a plugin never hangs", async () => {
		const answer = requestConfirm("nobody will draw this");
		resetModals();
		expect(await answer).toBe(false);
		expect(getModals()).toHaveLength(0);
	});
});
