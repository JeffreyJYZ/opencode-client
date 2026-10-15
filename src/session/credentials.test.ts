import { describe, expect, test } from "bun:test";
import { AUTH_USERNAME } from "@/constants/server";
import {
	authorizationHeader,
	basicToken,
	consumeAuthToken,
	passwordFromAuthToken,
} from "@/session/credentials";
import { TARGET_SOURCE } from "@/session/target";

describe("credentials", () => {
	test("the token is base64 of opencode:<password>, the shipped username", () => {
		expect(basicToken("secret")).toBe(btoa(`${AUTH_USERNAME}:secret`));
		expect(atob(basicToken("secret"))).toBe("opencode:secret");
	});

	test("the password is read after the first colon, so a colon survives", () => {
		expect(passwordFromAuthToken(btoa("opencode:a:b"))).toBe("a:b");
	});

	test("an absent, separator-less or undecodable token yields no password", () => {
		expect(passwordFromAuthToken(null)).toBeUndefined();
		expect(passwordFromAuthToken("")).toBeUndefined();
		expect(passwordFromAuthToken(btoa("nocolon"))).toBeUndefined();
		expect(passwordFromAuthToken("not base64 %%%")).toBeUndefined();
	});

	test("the Authorization header is absent without a password", () => {
		const target = {
			url: "http://x",
			password: undefined,
			source: TARGET_SOURCE.origin,
		} as const;
		expect(authorizationHeader(target)).toBeUndefined();
		expect(authorizationHeader({ ...target, password: "" })).toBeUndefined();
	});

	test("the Authorization header is HTTP basic with the shipped username", () => {
		const target = { url: "http://x", password: "pw", source: TARGET_SOURCE.injected } as const;
		expect(authorizationHeader(target)).toBe(`Basic ${basicToken("pw")}`);
	});
});

describe("consumeAuthToken", () => {
	test("a search without the parameter is returned unchanged", () => {
		expect(consumeAuthToken("?keep=1")).toEqual({ password: undefined, search: "?keep=1" });
	});

	test("the parameter is removed and its password returned", () => {
		const consumed = consumeAuthToken(`?keep=1&auth_token=${btoa("opencode:pw")}`);
		expect(consumed.password).toBe("pw");
		expect(consumed.search).toBe("?keep=1");
		expect(consumed.search).not.toContain("auth_token");
	});

	test("an empty search stays empty and a token-only search becomes empty", () => {
		expect(consumeAuthToken("")).toEqual({ password: undefined, search: "" });
		expect(consumeAuthToken(`?auth_token=${btoa("opencode:pw")}`).search).toBe("");
	});
});
