import { describe, expect, test } from "bun:test";
import { SLOT } from "@/constants/slots";
import { isLockedSlot, SLOTS } from "@/plugins/slots";

/**
 * The host registry's coverage gate (M4.12). The row exists because the in-app
 * reference advertises every slot in `SLOTS` while ten of them rendered nowhere;
 * the reference is generated from the tuple, so the only thing that can drift is a
 * slot added to the tuple with no host in `SLOT`. This fails the moment that
 * happens, which is what stops a slot being advertised without a renderer.
 */
describe("the slot host registry", () => {
	test("covers every advertised slot except the two locked areas", () => {
		const hosted = new Set<string>(Object.values(SLOT));
		const missing = SLOTS.filter((slot) => !isLockedSlot(slot) && !hosted.has(slot));
		expect(missing).toEqual([]);
	});

	test("names no locked area (M4.17 mounts the substrate)", () => {
		expect(Object.values(SLOT).filter(isLockedSlot)).toEqual([]);
	});
});
