import { describe, expect, test } from "bun:test";
import type { UpdateOffer, UpdateSeam } from "@/updates/seam";
import { checkForUpdate } from "@/updates/updater";

/**
 * The updater seam (M5.6): the boundary the flow drives, and the check's public
 * shape — the one M5.4 shipped, with the offer now carried rather than dropped.
 *
 * The seam is replaced here, so no test in this file calls the real plugin.
 */

function fakeSeam(options: {
	readonly supported?: boolean;
	readonly offer?: UpdateOffer | null;
	readonly fail?: boolean;
}): UpdateSeam {
	return {
		isSupported: () => options.supported ?? true,
		check: () =>
			options.fail === true
				? Promise.reject(new Error("no release host"))
				: Promise.resolve(options.offer ?? null),
		downloadAndInstall: () => Promise.resolve(),
		relaunch: () => Promise.resolve(),
	};
}

const OFFER: UpdateOffer = { version: "1.2.0", release: () => undefined };

describe("checkForUpdate", () => {
	test("a build that cannot update is unsupported, not an error", async () => {
		const result = await checkForUpdate(fakeSeam({ supported: false }));
		expect(result.kind).toBe("unsupported");
	});

	test("a check that finds nothing is current", async () => {
		const result = await checkForUpdate(fakeSeam({ offer: null }));
		expect(result.kind).toBe("current");
	});

	test("a check that finds a release is available, and carries the offer", async () => {
		const result = await checkForUpdate(fakeSeam({ offer: OFFER }));
		expect(result.kind).toBe("available");
		if (result.kind !== "available") return;
		expect(result.version).toBe("1.2.0");
		// The handle survives the check — that is what M5.6 fixes.
		expect(result.offer).toBe(OFFER);
	});

	test("a check that fails is failed, never a throw", async () => {
		const result = await checkForUpdate(fakeSeam({ fail: true }));
		expect(result.kind).toBe("failed");
	});
});
