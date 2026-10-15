import { describe, expect, test } from "bun:test";
import { createConnectionStore } from "@/session/connection";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { TARGET_SOURCE } from "@/session/target";
import { fakeProbe, fakeTimers, settled } from "@/test/session";

const TARGET = {
	url: "http://127.0.0.1:5211",
	password: undefined,
	source: TARGET_SOURCE.dev,
} as const;

/** A store over the shared doubles; `pollMs: 0` unless the test drives the clock. */
function storeWith(probe: ReturnType<typeof fakeProbe>, pollMs = 0) {
	const clock = fakeTimers();
	const store = createConnectionStore({
		target: TARGET,
		probe: probe.run,
		pollMs,
		timers: clock.timers,
	});
	return { store, clock };
}

describe("createConnectionStore", () => {
	test("no target is the `none` state: it never probes and never reports a failure", async () => {
		const probe = fakeProbe("reject");
		const store = createConnectionStore({ target: null, probe: probe.run, pollMs: 0 });
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.none });
		await store.check();
		store.reportFailure(new Error("boom"));
		expect(probe.calls()).toBe(0);
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.none });
	});

	test("unknown → online when the probe resolves", async () => {
		const probe = fakeProbe("resolve");
		const { store } = storeWith(probe);
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.unknown, url: TARGET.url });
		await store.check();
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.online, url: TARGET.url });
	});

	test("unknown → offline when the probe fails, naming the url and the reason", async () => {
		const { store } = storeWith(fakeProbe("reject"));
		await store.check();
		expect(store.getState()).toEqual({
			status: CONNECTION_STATUS.offline,
			url: TARGET.url,
			reason: "ECONNREFUSED",
		});
	});

	test("online → offline when another call fails", async () => {
		const { store } = storeWith(fakeProbe("resolve"));
		await store.check();
		expect(store.getState().status).toBe(CONNECTION_STATUS.online);
		store.reportFailure(new Error("server went away"));
		expect(store.getState()).toEqual({
			status: CONNECTION_STATUS.offline,
			url: TARGET.url,
			reason: "server went away",
		});
	});

	test("offline → online: the retry action recovers", async () => {
		const probe = fakeProbe("reject");
		const { store } = storeWith(probe);
		await store.check();
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
		probe.set("resolve");
		await store.check();
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.online, url: TARGET.url });
	});

	test("two checks in flight are one probe: a double-clicked retry is not a storm", async () => {
		const probe = fakeProbe("resolve");
		const { store } = storeWith(probe);
		await Promise.all([store.check(), store.check(), store.check()]);
		expect(probe.calls()).toBe(1);
	});

	test("offline schedules nothing, so no failing call loops", async () => {
		const probe = fakeProbe("reject");
		const { store, clock } = storeWith(probe, 5_000);
		await store.check();
		expect(clock.pending()).toBe(0);
	});

	test("online polls on the bound; a failing poll moves offline and stops the poll", async () => {
		const probe = fakeProbe("resolve");
		const { store, clock } = storeWith(probe, 5_000);
		await store.check();
		expect(clock.pending()).toBe(1);
		expect(clock.delays()).toEqual([5_000]);

		probe.set("reject");
		await clock.runNext();
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
		expect(clock.pending()).toBe(0);

		await settled();
		expect(probe.calls()).toBe(2);
	});

	test("a listener is told once per real transition, not per identical write", async () => {
		const { store } = storeWith(fakeProbe("resolve"));
		let notifications = 0;
		const unsubscribe = store.subscribe(() => {
			notifications++;
		});
		await store.check();
		expect(notifications).toBe(1);
		store.reportFailure(new Error("same"));
		expect(notifications).toBe(2);
		store.reportFailure(new Error("same"));
		expect(notifications).toBe(2);
		unsubscribe();
		store.reportFailure(new Error("different"));
		expect(notifications).toBe(2);
	});

	test("dispose cancels the poll and drops the listeners", async () => {
		const { store, clock } = storeWith(fakeProbe("resolve"), 5_000);
		await store.check();
		expect(clock.pending()).toBe(1);
		store.dispose();
		expect(clock.pending()).toBe(0);
	});
});
