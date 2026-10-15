import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	ACTIVITY,
	getActivitySnapshot,
	hydrateRunning,
	resetActivity,
	setSessionRunning,
} from "@/app/sessionActivity";

/**
 * The strip's running set. M2.1 feeds it from `session.execution.*` frames, so
 * these tests are about the set and its snapshot identity — the frames themselves
 * are `sessionIngest.test.ts`'s, against the captured stream.
 */

beforeEach(() => {
	resetActivity();
});

afterEach(() => {
	resetActivity();
});

describe("sessionActivity", () => {
	test("a started frame lights one session and only that one", () => {
		setSessionRunning("a", true);
		expect([...getActivitySnapshot()]).toEqual(["a"]);
		setSessionRunning("b", true);
		expect([...getActivitySnapshot()].sort()).toEqual(["a", "b"]);
	});

	test("a finished frame clears it again", () => {
		setSessionRunning("a", true);
		setSessionRunning("a", false);
		expect(getActivitySnapshot().size).toBe(0);
	});

	test("an unchanged write keeps the snapshot identity", () => {
		setSessionRunning("a", true);
		const first = getActivitySnapshot();
		setSessionRunning("a", true);
		setSessionRunning("b", false);
		expect(getActivitySnapshot()).toBe(first);
	});

	test("hydrateRunning adopts the already-running ids and keeps identity when unchanged", () => {
		hydrateRunning(["a", "b"]);
		const first = getActivitySnapshot();
		expect([...first].sort()).toEqual(["a", "b"]);
		hydrateRunning(["a", "b"]);
		expect(getActivitySnapshot()).toBe(first);
		hydrateRunning(["a"]);
		expect(getActivitySnapshot()).not.toBe(first);
	});

	test("the ingest's sink is these three calls", () => {
		ACTIVITY.setRunning("a", true);
		expect([...getActivitySnapshot()]).toEqual(["a"]);
		ACTIVITY.hydrate(["b"]);
		expect([...getActivitySnapshot()]).toEqual(["b"]);
		ACTIVITY.clear();
		expect(getActivitySnapshot().size).toBe(0);
	});

	test("resetActivity clears and is a no-op on an empty set", () => {
		const first = getActivitySnapshot();
		resetActivity();
		expect(getActivitySnapshot()).toBe(first);
		setSessionRunning("a", true);
		resetActivity();
		expect(getActivitySnapshot().size).toBe(0);
	});
});
