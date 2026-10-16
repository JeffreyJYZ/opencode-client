import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { Glob } from "bun";
import { SLOT } from "@/constants/slots";
import { isLockedSlot, SLOTS } from "@/plugins/slots";

/**
 * The host coverage gate (M4.12, corrected by M4.18).
 *
 * M4.12's check compared `SLOTS` against `Object.values(SLOT)` — two hand-written
 * lists of the same strings — so it stayed green while `session.sidebar.panels`
 * was advertised and mounted nowhere. It never read a mount site, so its claim
 * ("this fails the moment a slot is advertised with no renderer") was false.
 *
 * This one reads the source. Every advertised, non-locked slot must be named by
 * the `id` of a real `<Slot>` / `<SlotRegion>` in `src/**`, where that `id` is a
 * string literal or a key of one of the flat slot-name maps (`SLOT`,
 * `TOPNAV_REGION`, …). Test files do not count: a test that renders a slot is not
 * a host.
 *
 * What it proves: every advertised slot **names a mount site**. What it cannot
 * prove: that the mount renders — a `<Slot>` in unreachable code passes here. That
 * layer is each surface's own `*.slots.test.tsx` (Shell, HomePage, SessionPage,
 * SettingsPage, Composer, Transcript, Statusline, Sidebar), which mount the real
 * component and assert the contribution appears.
 */

/** Repo root, from `src/constants/`. */
const ROOT = resolvePath(import.meta.dir, "../..");

/** Source files under `src` with this extension, minus the tests (a test is not a host). */
function sources(extension: string): string[] {
	const files: string[] = [];
	for (const file of new Glob(`src/**/*.${extension}`).scanSync({ cwd: ROOT })) {
		if (!file.includes(".test.")) files.push(file);
	}
	return files;
}

/** Read a repo-relative source file. */
function source(file: string): string {
	return readFileSync(resolvePath(ROOT, file), "utf8");
}

/**
 * The flat `export const NAME = { key: "value" }` maps a mount's `id` may name, so
 * `TOPNAV_REGION.left` resolves to `topnav.left` exactly as `SLOT.topnavLeft` does.
 */
function aliasMaps(): Map<string, Map<string, string>> {
	const maps = new Map<string, Map<string, string>>();
	for (const file of [...sources("ts"), ...sources("tsx")]) {
		for (const decl of source(file).matchAll(/export const (\w+) = \{([^}]*)\}/g)) {
			const entries = new Map<string, string>();
			for (const pair of decl[2].matchAll(/(\w+):\s*"([^"]+)"/g))
				entries.set(pair[1], pair[2]);
			maps.set(decl[1], entries);
		}
	}
	return maps;
}

/** The slot value an `id` names, or null if it is neither a string literal nor an alias key. */
function slotOf(expression: string, maps: Map<string, Map<string, string>>): string | null {
	const literal = expression.match(/^"([^"]+)"$/);
	if (literal !== null) return literal[1];
	const ref = expression.match(/^(\w+)\.(\w+)$/);
	if (ref !== null) return maps.get(ref[1])?.get(ref[2]) ?? null;
	return null;
}

/** A mount's `id`, whether written `id="slot"` or `id={SLOT.slot}`. */
const MOUNT = /<Slot(?:Region)?\s[^>]*?id=(?:\{([^}]+)\}|"([^"]+)")/g;

/** Every slot value named by a `<Slot>` / `<SlotRegion>` mount in the source. */
function mountedSlots(): Set<string> {
	const maps = aliasMaps();
	const mounted = new Set<string>();
	for (const file of sources("tsx")) {
		for (const mount of source(file).matchAll(MOUNT)) {
			const expression = (mount[1] ?? `"${mount[2]}"`).trim();
			const slot = slotOf(expression, maps);
			if (slot !== null) mounted.add(slot);
		}
	}
	return mounted;
}

describe("the slot host registry", () => {
	test("mounts every advertised slot except the two locked areas", () => {
		const mounted = mountedSlots();
		const missing = SLOTS.filter((slot) => !isLockedSlot(slot) && !mounted.has(slot));
		expect(missing).toEqual([]);
	});

	test("names no locked area (M4.17 mounts the substrate)", () => {
		expect(Object.values(SLOT).filter(isLockedSlot)).toEqual([]);
	});
});
