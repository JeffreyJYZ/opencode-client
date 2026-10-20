import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetSettings } from "@/app/settings/store";
import { fakeOffer, fakeSeam, resetUpdateFlow } from "@/test/updates";
import {
	checkForUpdates,
	dismissUpdate,
	getUpdateState,
	installUpdate,
	subscribeUpdateState,
} from "@/updates/store";
import { setUpdateSeam } from "@/updates/updater";

/**
 * The update store's installing half (M5.6): the download's progress, the
 * relaunch that follows it, and what a failure looks like.
 *
 * The seam is replaced here, so no test in this file calls the real plugin.
 */

beforeEach(() => {
	resetSettings();
	resetUpdateFlow();
});

afterEach(() => {
	resetSettings();
	resetUpdateFlow();
});

describe("the update store — installing", () => {
	test("installing downloads with a real percentage and then relaunches", async () => {
		const seam = fakeSeam({
			offer: fakeOffer("1.2.0"),
			progress: [
				{ received: 25, total: 100 },
				{ received: 100, total: 100 },
			],
		});
		setUpdateSeam(seam);
		await checkForUpdates();
		await installUpdate();
		expect(seam.relaunched()).toBe(1);
		expect(getUpdateState().phase).toBe("idle");
	});

	test("the download's percentage reaches the surface while it runs", async () => {
		setUpdateSeam(
			fakeSeam({
				offer: fakeOffer("1.2.0"),
				progress: [{ received: 40, total: 100 }],
			}),
		);
		await checkForUpdates();
		const seen: (number | null)[] = [];
		const stop = subscribeUpdateState(() => seen.push(getUpdateState().percent));
		await installUpdate();
		stop();
		expect(seen).toContain(40);
	});

	test("an unknown total is a null percent, never a fake one", async () => {
		setUpdateSeam(
			fakeSeam({
				offer: fakeOffer("1.2.0"),
				progress: [{ received: 500, total: null }],
			}),
		);
		await checkForUpdates();
		const seen: (number | null)[] = [];
		const stop = subscribeUpdateState(() => seen.push(getUpdateState().percent));
		await installUpdate();
		stop();
		expect(seen).toContain(null);
		expect(seen.some((percent) => percent !== null)).toBe(false);
	});

	test("an install that fails is a message, never a throw and never a stuck percent", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0"), failInstall: true }));
		await checkForUpdates();
		await installUpdate();
		const state = getUpdateState();
		expect(state.phase).toBe("failed");
		expect(state.message).not.toBeNull();
		expect(state.percent).toBeNull();
	});

	test("a relaunch that fails is a message too", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0"), failRelaunch: true }));
		await checkForUpdates();
		await installUpdate();
		expect(getUpdateState().phase).toBe("failed");
		expect(getUpdateState().message).not.toBeNull();
	});

	test("a dismissal mid-download is refused: the handle is in flight", async () => {
		const pending = Promise.withResolvers<void>();
		setUpdateSeam({
			isSupported: () => true,
			check: () => Promise.resolve(fakeOffer("1.2.0")),
			downloadAndInstall: async (_offer, report) => {
				report({ received: 10, total: 100 });
				await pending.promise;
			},
			relaunch: () => Promise.resolve(),
		});
		await checkForUpdates();
		const installing = installUpdate();
		dismissUpdate();
		expect(getUpdateState().phase).toBe("downloading");
		pending.resolve();
		await installing;
	});
});
