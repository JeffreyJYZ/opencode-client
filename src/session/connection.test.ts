import { describe, expect, test } from "bun:test";
import { createConnectionStore } from "@/session/connection";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { TARGET_SOURCE } from "@/session/target";
import { fakeProbe, settled } from "@/test/session";

const TARGET = {
	url: "http://127.0.0.1:5211",
	password: undefined,
	source: TARGET_SOURCE.dev,
} as const;

function storeWith(probe: ReturnType<typeof fakeProbe>) {
	return createConnectionStore({ target: TARGET, probe: probe.run });
}

describe("createConnectionStore", () => {
	test("no target is the `none` state: it never probes and never reports a failure", async () => {
		const probe = fakeProbe("reject");
		const store = createConnectionStore({ target: null, probe: probe.run });
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.none });
		await store.check();
		store.reportOnline();
		store.reportFailure(new Error("boom"));
		expect(probe.calls()).toBe(0);
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.none });
	});

	test("unknown → online when the probe resolves", async () => {
		const probe = fakeProbe("resolve");
		const store = storeWith(probe);
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.unknown, url: TARGET.url });
		await store.check();
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.online, url: TARGET.url });
	});

	test("unknown → offline when the probe fails, naming the url and the reason", async () => {
		const store = storeWith(fakeProbe("reject"));
		await store.check();
		expect(store.getState()).toEqual({
			status: CONNECTION_STATUS.offline,
			url: TARGET.url,
			reason: "ECONNREFUSED",
		});
	});

	test("online → offline when another call fails", async () => {
		const store = storeWith(fakeProbe("resolve"));
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
		const store = storeWith(probe);
		await store.check();
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
		probe.set("resolve");
		await store.check();
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.online, url: TARGET.url });
	});

	test("two checks in flight are one probe: a double-clicked retry is not a storm", async () => {
		const probe = fakeProbe("resolve");
		const store = storeWith(probe);
		await Promise.all([store.check(), store.check(), store.check()]);
		expect(probe.calls()).toBe(1);
	});

	test("offline schedules nothing, so no failing call loops", async () => {
		const probe = fakeProbe("reject");
		const store = storeWith(probe);
		await store.check();
		await settled();
		expect(probe.calls()).toBe(1);
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
	});

	test("the event stream going live reports online without a probe", async () => {
		const probe = fakeProbe("reject");
		const store = storeWith(probe);
		await store.check();
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
		store.reportOnline();
		expect(store.getState()).toEqual({ status: CONNECTION_STATUS.online, url: TARGET.url });
		expect(probe.calls()).toBe(1);
	});

	test("a listener is told once per real transition, not per identical write", async () => {
		const store = storeWith(fakeProbe("resolve"));
		let notifications = 0;
		const unsubscribe = store.subscribe(() => {
			notifications++;
		});
		await store.check();
		expect(notifications).toBe(1);
		store.reportOnline();
		expect(notifications).toBe(1);
		store.reportFailure(new Error("same"));
		expect(notifications).toBe(2);
		store.reportFailure(new Error("same"));
		expect(notifications).toBe(2);
		unsubscribe();
		store.reportFailure(new Error("different"));
		expect(notifications).toBe(2);
	});

	test("dispose drops the listeners; the state stays readable", async () => {
		const store = storeWith(fakeProbe("resolve"));
		await store.check();
		let notifications = 0;
		store.subscribe(() => {
			notifications++;
		});
		store.dispose();
		store.reportFailure(new Error("after dispose"));
		expect(notifications).toBe(0);
		expect(store.getState().status).toBe(CONNECTION_STATUS.offline);
	});
});
