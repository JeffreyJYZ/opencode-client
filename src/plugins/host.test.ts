import { beforeEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { APP_VERSION, HOST_API_VERSION } from "@/constants/plugins";
import { emitAppEvent } from "@/plugins/appEvents";
import { createHostFactory, type NativeDeps } from "@/plugins/host";
import { clearLogs, listLogs } from "@/plugins/logs";
import type { NativeFs } from "@/plugins/services/native";
import type { PluginNotifier } from "@/plugins/services/notify";
import { PLUGIN_NOTICE_KIND } from "@/plugins/services/notify";

/**
 * The host's **services** (M4.4, spec 040 §The host): each states what a plugin
 * may call and what happens when the underlying thing is unavailable. The
 * registries have their own file; the loader's positive pass has another.
 */

const noopFs: NativeFs = {
	realpath: async () => "",
	readText: async () => "",
	writeText: async () => {},
	list: async () => [],
	remove: async () => {},
	mkdirp: async () => {},
};

const nativeDeps: NativeDeps = { fs: noopFs, dataRoot: "/tmp" };

beforeEach(() => {
	clearLogs();
});

describe("version and signal", () => {
	test("version is the named pair, frozen", () => {
		const { host } = createHostFactory()("m44-a");
		expect(host.version).toEqual({ app: APP_VERSION, api: HOST_API_VERSION });
		expect(Object.isFrozen(host.version)).toBe(true);
	});

	test("the signal aborts when the plugin is disposed", () => {
		const { host, instance } = createHostFactory()("m44-a");
		expect(host.signal.aborted).toBe(false);
		instance.dispose();
		expect(host.signal.aborted).toBe(true);
	});
});

describe("storage and log", () => {
	test("two hosts on one backend keep separate namespaces", async () => {
		const factory = createHostFactory();
		const a = factory("m44-a").host;
		const b = factory("m44-b").host;
		await a.storage.set("k", "a");
		await b.storage.set("k", "b");
		expect(await a.storage.get("k")).toBe("a");
		expect(await b.storage.get("k")).toBe("b");
	});

	test("the log is stamped with the plugin's id", () => {
		const { host } = createHostFactory()("m44-a");
		host.log.warn("careful");
		expect(listLogs()).toHaveLength(1);
		expect(listLogs()[0]?.pluginId).toBe("m44-a");
		expect(listLogs()[0]?.message).toBe("careful");
	});
});

describe("notify", () => {
	test("with no notifier it is a no-op and confirm resolves false", async () => {
		const { host } = createHostFactory()("m44-a");
		expect(() => host.notify.toast("hi")).not.toThrow();
		expect(await host.notify.confirm("sure?")).toBe(false);
	});

	test("with a notifier it forwards kind and message", async () => {
		const seen: Array<{ kind: string; message: string }> = [];
		const notifier: PluginNotifier = {
			show: (notice) => seen.push(notice),
			confirm: async () => true,
		};
		const { host } = createHostFactory({ notifier })("m44-a");
		host.notify.toast("a");
		host.notify.banner("b");
		host.notify.modal("c");
		expect(seen.map((notice) => notice.kind)).toEqual([
			PLUGIN_NOTICE_KIND.toast,
			PLUGIN_NOTICE_KIND.banner,
			PLUGIN_NOTICE_KIND.modal,
		]);
		expect(await host.notify.confirm("ok?")).toBe(true);
	});
});

describe("native, transcript and opencode", () => {
	test("native is null without an adapter and present with one", () => {
		expect(createHostFactory()("m44-a").host.native).toBeNull();
		expect(createHostFactory({ native: nativeDeps })("m44-a").host.native).not.toBeNull();
	});

	test("transcript with no session is null id; opencode.client is null", () => {
		const { host } = createHostFactory()("m44-a");
		expect(host.transcript.snapshot().sessionID).toBeNull();
		expect(host.opencode.client).toBeNull();
	});

	test("opencode.on filters the stream; with no source it never fires", () => {
		const handlers: Array<(event: V2Event) => void> = [];
		const subscribe = (handler: (event: V2Event) => void) => {
			handlers.push(handler);
			return () => handlers.splice(handlers.indexOf(handler), 1);
		};
		const { host } = createHostFactory({ subscribe })("m44-a");
		const seen: string[] = [];
		const off = host.opencode.on("session.*", (event) => seen.push(event.type));
		emitAppEvent("turn-start");
		for (const handler of handlers) {
			handler({ type: "session.updated" } as unknown as V2Event);
			handler({ type: "message.part" } as unknown as V2Event);
		}
		expect(seen).toEqual(["session.updated"]);
		off();
		const silent = createHostFactory()("m44-b");
		expect(() => silent.host.opencode.on("session.*", () => {})()).not.toThrow();
	});
});

describe("app events", () => {
	test("host.on receives an emitted app event, and stops on unsubscribe", () => {
		const { host, instance } = createHostFactory()("m44-a");
		const seen: unknown[] = [];
		host.on("turn-start", (payload) => seen.push(payload));
		emitAppEvent("turn-start", { id: 1 });
		expect(seen).toEqual([{ id: 1 }]);
		instance.dispose();
		emitAppEvent("turn-start", { id: 2 });
		expect(seen).toEqual([{ id: 1 }]);
	});
});
