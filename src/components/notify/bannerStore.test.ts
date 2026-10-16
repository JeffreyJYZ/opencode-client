import { afterEach, describe, expect, test } from "bun:test";
import {
	dismissBanner,
	getBanners,
	pushBanner,
	resetBanners,
	subscribeBanners,
} from "@/components/notify/bannerStore";

/**
 * The banner store (M4.20): a persistent list any module can speak through. Its
 * contract is what `useSyncExternalStore` needs — a new snapshot per change — and
 * it holds **no timer**, which is the difference from the toast store.
 */

afterEach(resetBanners);

describe("the banner store", () => {
	test("a push is a new snapshot and notifies every listener", () => {
		const lengths: number[] = [];
		const stop = subscribeBanners(() => lengths.push(getBanners().length));
		const before = getBanners();
		const id = pushBanner("hello");
		expect(getBanners()).not.toBe(before);
		expect(getBanners()).toEqual([{ id, message: "hello" }]);
		expect(lengths).toEqual([1]);
		stop();
		pushBanner("after unsubscribe");
		expect(lengths).toEqual([1]);
	});

	test("dismiss removes exactly the id it names", () => {
		const first = pushBanner("one");
		pushBanner("two");
		dismissBanner(first);
		expect(getBanners().map((banner) => banner.message)).toEqual(["two"]);
	});

	test("reset clears everything", () => {
		pushBanner("plain");
		resetBanners();
		expect(getBanners()).toHaveLength(0);
	});
});
