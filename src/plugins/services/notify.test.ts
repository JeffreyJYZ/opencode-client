import { describe, expect, test } from "bun:test";
import { createPluginNotify, NO_NOTIFIER, PLUGIN_NOTICE_KIND } from "@/plugins/services/notify";

/**
 * The `notify` service's **no-app** default (M4.20): with no ports there is no
 * chrome to draw, so every kind is a no-op and `confirm` resolves `false` — it must
 * never hang a plugin on a dialog nobody drew. This is not the app's notifier: the
 * app supplies a real one (`src/app/hostPorts.ts`), which is what this row fixes.
 */

describe("the no-app notifier default", () => {
	test("every kind is a no-op and never throws", () => {
		const notify = createPluginNotify();
		expect(() => notify.toast("a")).not.toThrow();
		expect(() => notify.banner("b")).not.toThrow();
		expect(() => notify.modal("c")).not.toThrow();
	});

	/**
	 * A hang here would blow bun's own per-test bound and fail — so a resolving
	 * await **is** the proof that the no-app `confirm` never hangs.
	 */
	test("confirm resolves false without hanging", async () => {
		expect(await createPluginNotify().confirm("sure?")).toBe(false);
	});

	test("NO_NOTIFIER is the documented no-app default", async () => {
		expect(() =>
			NO_NOTIFIER.show({ kind: PLUGIN_NOTICE_KIND.toast, message: "x" }),
		).not.toThrow();
		expect(await NO_NOTIFIER.confirm("x")).toBe(false);
	});
});
