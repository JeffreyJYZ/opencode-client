import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	getActivitySnapshot,
	refreshActivity,
	resetActivity,
	startActivityPolling,
} from "@/app/sessionActivity";
import type { OpenCodeClient } from "@/session/client";

function fakeClient(ids: string[]): OpenCodeClient {
	return {
		session: {
			active: async () => Object.fromEntries(ids.map((id) => [id, { type: "running" }])),
		},
	} as unknown as OpenCodeClient;
}

beforeEach(() => {
	resetActivity();
});

afterEach(() => {
	resetActivity();
});

describe("sessionActivity", () => {
	test("refreshActivity records the running ids", async () => {
		await refreshActivity(fakeClient(["a", "b"]));
		expect([...getActivitySnapshot()].sort()).toEqual(["a", "b"]);
	});

	test("an unchanged poll keeps the snapshot identity", async () => {
		await refreshActivity(fakeClient(["a", "b"]));
		const first = getActivitySnapshot();
		await refreshActivity(fakeClient(["a", "b"]));
		expect(getActivitySnapshot()).toBe(first);
	});

	test("a changed poll publishes a new set", async () => {
		await refreshActivity(fakeClient(["a"]));
		const first = getActivitySnapshot();
		await refreshActivity(fakeClient(["a", "b"]));
		expect(getActivitySnapshot()).not.toBe(first);
		expect([...getActivitySnapshot()]).toEqual(["a", "b"]);
	});

	test("resetActivity clears the running set", async () => {
		await refreshActivity(fakeClient(["a"]));
		resetActivity();
		expect(getActivitySnapshot().size).toBe(0);
	});

	test("a failed read keeps the last state", async () => {
		await refreshActivity(fakeClient(["a"]));
		const client = {
			session: {
				active: async () => {
					throw new Error("boom");
				},
			},
		} as unknown as OpenCodeClient;
		await expect(refreshActivity(client)).rejects.toBeInstanceOf(Error);
		expect([...getActivitySnapshot()]).toEqual(["a"]);
	});

	test("startActivityPolling returns a stop function and reads once immediately", async () => {
		const stop = startActivityPolling(fakeClient(["x"]));
		// the immediate read is async; let it settle
		await Bun.sleep(0);
		expect([...getActivitySnapshot()]).toEqual(["x"]);
		stop();
	});
});
