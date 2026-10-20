import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getSettings, resetSettings, updateSettings } from "@/app/settings/store";
import { SETTING_KEYS } from "@/constants/settings";
import { fakeOffer, fakeSeam, resetUpdateFlow } from "@/test/updates";
import {
	checkForUpdates,
	dismissUpdate,
	getUpdateState,
	subscribeUpdateState,
} from "@/updates/store";
import { setUpdateSeam, updatesSupported } from "@/updates/updater";

/**
 * The update store's checking half (M5.6): the phases a check moves through,
 * and the dismissal that survives a restart.
 *
 * The seam is replaced here, so no test in this file calls the real plugin —
 * the shell does not exist under happy-dom, and a real check would reach for an
 * IPC channel that is not there.
 */

beforeEach(() => {
	resetSettings();
	resetUpdateFlow();
});

afterEach(() => {
	resetSettings();
	resetUpdateFlow();
});

describe("the update store — checking", () => {
	test("a check that finds a release offers it, with the version", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		await checkForUpdates();
		expect(getUpdateState().phase).toBe("available");
		expect(getUpdateState().version).toBe("1.2.0");
	});

	test("a check that finds nothing is current", async () => {
		setUpdateSeam(fakeSeam({ offer: null }));
		await checkForUpdates();
		expect(getUpdateState().phase).toBe("current");
		expect(getUpdateState().version).toBeNull();
	});

	test("a check that fails changes nothing and shows nothing", async () => {
		const before = getUpdateState();
		setUpdateSeam({
			isSupported: () => true,
			check: () => Promise.reject(new Error("offline")),
			downloadAndInstall: () => Promise.resolve(),
			relaunch: () => Promise.resolve(),
		});
		await checkForUpdates();
		expect(getUpdateState().phase).toBe(before.phase);
		expect(getUpdateState().message).toBeNull();
	});

	test("a build that cannot update offers nothing", async () => {
		setUpdateSeam(fakeSeam({ supported: false, offer: fakeOffer("1.2.0") }));
		await checkForUpdates();
		expect(getUpdateState().phase).toBe("current");
		expect(getUpdateState().version).toBeNull();
		expect(updatesSupported()).toBe(false);
	});

	test("a build that can update says so", async () => {
		setUpdateSeam(fakeSeam({ offer: null }));
		await checkForUpdates();
		expect(updatesSupported()).toBe(true);
	});

	test("a check while one is running is a no-op", async () => {
		let checks = 0;
		const pending = Promise.withResolvers<null>();
		setUpdateSeam({
			isSupported: () => true,
			check: () => {
				checks += 1;
				return pending.promise;
			},
			downloadAndInstall: () => Promise.resolve(),
			relaunch: () => Promise.resolve(),
		});
		const first = checkForUpdates();
		await checkForUpdates();
		expect(checks).toBe(1);
		pending.resolve(null);
		await first;
	});

	test("subscribers are told when the state changes", async () => {
		const seen: string[] = [];
		const stop = subscribeUpdateState(() => seen.push(getUpdateState().phase));
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		await checkForUpdates();
		expect(seen).toContain("checking");
		expect(seen[seen.length - 1]).toBe("available");
		const heard = seen.length;
		stop();
		setUpdateSeam(fakeSeam({ offer: null }));
		await checkForUpdates();
		expect(seen.length).toBe(heard);
		expect(getUpdateState().phase).toBe("current");
	});
});

describe("the update store — dismissing", () => {
	test("dismissing remembers the version, so the same release is not offered again", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		await checkForUpdates();
		dismissUpdate();
		expect(getUpdateState().phase).toBe("idle");
		expect(getUpdateState().version).toBeNull();
		await checkForUpdates();
		expect(getUpdateState().phase).toBe("current");
		expect(getUpdateState().version).toBeNull();
	});

	test("a newer release still surfaces after a dismissal", async () => {
		updateSettings({ dismissedUpdateVersion: "1.2.0" });
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.3.0") }));
		await checkForUpdates();
		expect(getUpdateState().phase).toBe("available");
		expect(getUpdateState().version).toBe("1.3.0");
	});

	test("the declined version is written into the blob under its own key", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		await checkForUpdates();
		dismissUpdate();
		expect(getSettings()[SETTING_KEYS.dismissedUpdateVersion]).toBe("1.2.0");
	});
});
