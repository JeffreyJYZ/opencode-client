import { describe, expect, test } from "bun:test";
import {
	originCandidate,
	resolveTarget,
	TARGET_SOURCE,
	type TargetCandidates,
} from "@/session/target";

const INJECTED = { url: "http://injected:1", password: "injected-pw" };
const STORED = { url: "http://stored:2", password: "stored-pw" };
const DEV = { url: "http://dev:3", password: "dev-pw" };
const ORIGIN = { url: "http://origin:4" };

/** The four sources with only what the test names present. */
function candidates(overrides: Partial<TargetCandidates>): TargetCandidates {
	return {
		injected: undefined,
		stored: undefined,
		dev: undefined,
		origin: undefined,
		authTokenPassword: undefined,
		...overrides,
	};
}

describe("resolveTarget", () => {
	test("the injected global wins over every other source", () => {
		const target = resolveTarget(
			candidates({ injected: INJECTED, stored: STORED, dev: DEV, origin: ORIGIN }),
		);
		expect(target?.source).toBe(TARGET_SOURCE.injected);
		expect(target?.url).toBe(INJECTED.url);
	});

	test("the stored target wins once the global is absent", () => {
		const target = resolveTarget(candidates({ stored: STORED, dev: DEV, origin: ORIGIN }));
		expect(target?.source).toBe(TARGET_SOURCE.stored);
	});

	test("the dev override wins over the page's origin", () => {
		const target = resolveTarget(candidates({ dev: DEV, origin: ORIGIN }));
		expect(target?.source).toBe(TARGET_SOURCE.dev);
	});

	test("the page's own origin is the last source", () => {
		const target = resolveTarget(candidates({ origin: ORIGIN }));
		expect(target?.source).toBe(TARGET_SOURCE.origin);
		expect(target?.password).toBeUndefined();
	});

	test("no source at all resolves to null, not to an error", () => {
		expect(resolveTarget(candidates({}))).toBeNull();
	});

	test("a blank url is not a target, so the next source wins", () => {
		const target = resolveTarget(candidates({ injected: { url: "   " }, dev: DEV }));
		expect(target?.source).toBe(TARGET_SOURCE.dev);
	});

	test("the url is trimmed", () => {
		const target = resolveTarget(candidates({ injected: { url: "  http://injected:1\n" } }));
		expect(target?.url).toBe("http://injected:1");
	});

	test("the auth_token password fills a source that carries none", () => {
		const target = resolveTarget(
			candidates({ origin: ORIGIN, authTokenPassword: "from-token" }),
		);
		expect(target?.password).toBe("from-token");
	});

	test("a source's own password wins over the auth_token", () => {
		const target = resolveTarget(
			candidates({ injected: INJECTED, authTokenPassword: "from-token" }),
		);
		expect(target?.password).toBe(INJECTED.password);
	});
});

describe("originCandidate", () => {
	test("is absent in a dev build: the dev server is not the API", () => {
		expect(originCandidate(false, "http://localhost:5200")).toBeUndefined();
	});

	test("is the page's origin in a production build", () => {
		expect(originCandidate(true, "http://localhost:5200")).toEqual({
			url: "http://localhost:5200",
		});
	});

	test("an opaque origin is not a target", () => {
		expect(originCandidate(true, "null")).toBeUndefined();
		expect(originCandidate(true, "")).toBeUndefined();
	});
});
