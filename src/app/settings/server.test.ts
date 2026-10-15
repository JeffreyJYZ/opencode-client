import { describe, expect, test } from "bun:test";
import { normalizeServer } from "@/app/settings/server";

describe("normalizeServer — the stored target's hostile shapes", () => {
	test("a record with a url and a password is the stored target", () => {
		expect(normalizeServer({ url: "http://x:1", password: "pw" })).toEqual({
			url: "http://x:1",
			password: "pw",
		});
	});

	test("the url is trimmed and a missing password is an empty one", () => {
		expect(normalizeServer({ url: "  http://x:1\n" })).toEqual({
			url: "http://x:1",
			password: "",
		});
	});

	test("a blank url is no target", () => {
		expect(normalizeServer({ url: "   ", password: "pw" })).toBeNull();
		expect(normalizeServer({ password: "pw" })).toBeNull();
	});

	test("not a record, or a url that is not a string, is no target", () => {
		expect(normalizeServer(null)).toBeNull();
		expect(normalizeServer(undefined)).toBeNull();
		expect(normalizeServer("http://x:1")).toBeNull();
		expect(normalizeServer([{ url: "http://x:1" }])).toBeNull();
		expect(normalizeServer({ url: 7 })).toBeNull();
	});

	test("a password that is not a string is an empty one, never the url's", () => {
		expect(normalizeServer({ url: "http://x:1", password: 7 })).toEqual({
			url: "http://x:1",
			password: "",
		});
	});
});
