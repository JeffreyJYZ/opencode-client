import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetSettings } from "@/app/settings/store";
import { ROUTE_PATH } from "@/constants/routes";
import { ENV_PASSWORD, ENV_SERVER_URL, TARGET_GLOBAL } from "@/constants/server";
import {
	readAndStripAuthToken,
	readDevTarget,
	readInjectedTarget,
	readOriginTarget,
	resolveStartupTarget,
} from "@/session/environment";
import { TARGET_SOURCE } from "@/session/target";

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
	delete process.env[ENV_PASSWORD];
	resetSettings();
});

describe("readInjectedTarget", () => {
	test("is absent when the shell injected nothing at all (spec 010 §Window)", () => {
		expect(readInjectedTarget()).toBeUndefined();
	});

	test("is absent when the global is not an object or carries no url", () => {
		setInjected("http://x");
		expect(readInjectedTarget()).toBeUndefined();
		setInjected({ password: "pw" });
		expect(readInjectedTarget()).toBeUndefined();
		setInjected(null);
		expect(readInjectedTarget()).toBeUndefined();
	});

	test("carries the url and the password", () => {
		setInjected({ url: "http://injected:1", password: "pw" });
		expect(readInjectedTarget()).toEqual({ url: "http://injected:1", password: "pw" });
	});

	test("an absent or non-string password is no password", () => {
		setInjected({ url: "http://injected:1" });
		expect(readInjectedTarget()).toEqual({ url: "http://injected:1", password: undefined });
		setInjected({ url: "http://injected:1", password: 42 });
		expect(readInjectedTarget()?.password).toBeUndefined();
	});
});

describe("the other sources", () => {
	test("the dev override is present when the environment sets it, with its password", () => {
		process.env[ENV_SERVER_URL] = "http://127.0.0.1:5211";
		process.env[ENV_PASSWORD] = "dev-pw";
		expect(readDevTarget()).toEqual({ url: "http://127.0.0.1:5211", password: "dev-pw" });
	});

	test("a blank dev url is no target and a blank password is no password", () => {
		process.env[ENV_SERVER_URL] = "   ";
		expect(readDevTarget()).toBeUndefined();
		process.env[ENV_SERVER_URL] = "http://127.0.0.1:5211";
		process.env[ENV_PASSWORD] = "";
		expect(readDevTarget()?.password).toBeUndefined();
	});

	test("the page's origin is absent in a dev build, so a dev run needs the override", () => {
		expect(readOriginTarget()).toBeUndefined();
	});
});

describe("readAndStripAuthToken", () => {
	test("the token leaves the address bar and the rest of the url survives", () => {
		const token = btoa("opencode:pw");
		window.history.pushState(null, "", `/session/ses_x?keep=1&auth_token=${token}#frag`);

		expect(readAndStripAuthToken()).toBe("pw");

		expect(window.location.search).toBe("?keep=1");
		expect(window.location.hash).toBe("#frag");
		expect(window.location.pathname).toBe("/session/ses_x");
		expect(window.location.href).not.toContain("auth_token");
		expect(window.location.href).not.toContain(token);
	});

	test("a token-only url loses its whole query string", () => {
		window.history.pushState(null, "", `/?auth_token=${btoa("opencode:pw")}`);
		expect(readAndStripAuthToken()).toBe("pw");
		expect(window.location.search).toBe("");
	});

	test("a url without the token is left alone", () => {
		window.history.pushState(null, "", "/settings?tab=server");
		expect(readAndStripAuthToken()).toBeUndefined();
		expect(window.location.search).toBe("?tab=server");
	});
});

describe("resolveStartupTarget", () => {
	test("the injected global is the target, with the source that names it", () => {
		setInjected({ url: "http://injected:1", password: "pw" });
		const target = resolveStartupTarget();
		expect(target?.source).toBe(TARGET_SOURCE.injected);
		expect(target?.url).toBe("http://injected:1");
		expect(target?.password).toBe("pw");
	});

	test("an auth_token in the url becomes the password of the injected target", () => {
		setInjected({ url: "http://injected:1" });
		window.history.pushState(null, "", `/?auth_token=${btoa("opencode:from-url")}`);
		expect(resolveStartupTarget()?.password).toBe("from-url");
		expect(window.location.search).toBe("");
	});

	test("every source absent resolves to no target, the normal desktop state", () => {
		expect(resolveStartupTarget()).toBeNull();
	});

	test("with no injected global the dev override is the target", () => {
		process.env[ENV_SERVER_URL] = "http://127.0.0.1:5211";
		const target = resolveStartupTarget();
		expect(target?.source).toBe(TARGET_SOURCE.dev);
		expect(target?.url).toBe("http://127.0.0.1:5211");
	});
});
