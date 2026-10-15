import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetSettings, updateSettings } from "@/app/settings/store";
import { ROUTE_PATH } from "@/constants/routes";
import { ENV_SERVER_URL, TARGET_GLOBAL } from "@/constants/server";
import { readStoredTarget, resolveStartupTarget } from "@/session/environment";
import { TARGET_SOURCE } from "@/session/target";

/**
 * The stored source of spec 050's resolution order (spec 010 §Persistence's
 * `settings.server` cell). Split from `environment.test.ts` so the browser edge
 * and the blob edge are read as the two seams they are.
 */

const STORED = { url: "http://stored:9", password: "pw" };

function setInjected(value: unknown): void {
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = value;
}

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	delete process.env[ENV_SERVER_URL];
	resetSettings();
});

describe("readStoredTarget", () => {
	test("is absent until the connect flow stores one", () => {
		expect(readStoredTarget()).toBeUndefined();
	});

	test("is read from the settings blob; a blank password is no password", () => {
		updateSettings({ server: STORED });
		expect(readStoredTarget()).toEqual({ url: "http://stored:9", password: "pw" });
		updateSettings({ server: { url: "http://stored:9", password: "" } });
		expect(readStoredTarget()).toEqual({ url: "http://stored:9", password: undefined });
	});
});

describe("resolveStartupTarget — the stored source in the order", () => {
	test("with no injected global the stored target wins over the dev override", () => {
		process.env[ENV_SERVER_URL] = "http://127.0.0.1:5211";
		updateSettings({ server: STORED });
		const target = resolveStartupTarget();
		expect(target?.source).toBe(TARGET_SOURCE.stored);
		expect(target?.url).toBe("http://stored:9");
		expect(target?.password).toBe("pw");
	});

	test("a stored target does not beat an injected global", () => {
		updateSettings({ server: STORED });
		setInjected({ url: "http://injected:1", password: "pw" });
		const target = resolveStartupTarget();
		expect(target?.source).toBe(TARGET_SOURCE.injected);
		expect(target?.url).toBe("http://injected:1");
	});
});
