import { describe, expect, test } from "bun:test";
import {
	mentionsStillValid,
	promptPayloadOf,
	serverCommandInvocation,
	unsendableAttachment,
} from "@/session/promptPayload";
import type { ComposerMention } from "@/session/promptTypes";

/**
 * The prompt payload (M2.5, requirement 1: no component assembles one). The flat
 * shape is asserted literally — `sessionID` and `text` at the top level and **no
 * `id`/`payload` wrapper** (`docs/opencode-api.md` §4) — and so is the way mentions
 * become the three arrays the server reads.
 */

const mention = (over: Partial<ComposerMention>): ComposerMention => ({
	kind: "file",
	start: 4,
	end: 13,
	text: "@src/a.ts",
	value: "src/a.ts",
	...over,
});

describe("the prompt payload", () => {
	test("is flat: sessionID and text at the top level, never a wrapper", () => {
		const payload = promptPayloadOf({
			sessionID: "ses_1",
			text: "hello",
			attachments: [],
			mentions: [],
		});
		expect(payload).toEqual({ sessionID: "ses_1", text: "hello" });
		expect("id" in payload).toBe(false);
		expect("payload" in payload).toBe(false);
		expect("messageID" in payload).toBe(false);
	});

	test("carries an attachment as a path, and refuses one without a path", () => {
		const payload = promptPayloadOf({
			sessionID: "ses_1",
			text: "look",
			attachments: [
				{ uri: "file:///tmp/a.png", name: "a.png", sendable: true },
				{ uri: "", name: "dropped-without-a-path.png", sendable: false },
			],
			mentions: [],
		});
		expect(payload.files).toEqual([{ uri: "file:///tmp/a.png", name: "a.png" }]);
		expect(
			unsendableAttachment([
				{ uri: "file:///tmp/a.png", sendable: true },
				{ uri: "", name: "x", sendable: false },
			])?.name,
		).toBe("x");
		expect(unsendableAttachment([{ uri: "file:///tmp/a.png", sendable: true }])).toBeNull();
	});

	test("splits mentions into files, agents and skills, spans included", () => {
		const payload = promptPayloadOf({
			sessionID: "ses_1",
			text: "see @src/a.ts and @Build and @tdd",
			attachments: [],
			mentions: [
				mention({}),
				{ kind: "agent", start: 18, end: 24, text: "@Build", value: "Build" },
				{ kind: "skill", start: 29, end: 33, text: "@tdd", value: "tdd" },
			],
		});
		expect(payload.files?.[0]).toEqual({
			uri: "src/a.ts",
			name: "@src/a.ts",
			mention: { start: 4, end: 13, text: "@src/a.ts" },
		});
		expect(payload.agents).toEqual([
			{ name: "Build", mention: { start: 18, end: 24, text: "@Build" } },
		]);
		expect(payload.skills).toEqual([
			{ id: "tdd", mention: { start: 29, end: 33, text: "@tdd" } },
		]);
	});

	test("a mention whose span no longer matches its text is dropped", () => {
		const text = "see src/a.ts"; // edited before the mention: the offset moved
		expect(mentionsStillValid(text, [mention({})])).toEqual([]);
		expect(mentionsStillValid("see @src/a.ts", [mention({})])).toHaveLength(1);
	});

	test("only a command the server listed is an invocation, with its arguments", () => {
		expect(serverCommandInvocation("/m25", ["m25"])).toEqual({ name: "m25", text: "" });
		expect(serverCommandInvocation("  /m25 fix the parser ", ["m25"])).toEqual({
			name: "m25",
			text: "fix the parser",
		});
		// A path, a fraction or a name the server does not list is an ordinary prompt.
		expect(serverCommandInvocation("/etc/hosts is a file", ["m25"])).toBeNull();
		expect(serverCommandInvocation("1/2 of the work", ["m25"])).toBeNull();
		expect(serverCommandInvocation("/m25\nsecond line", ["m25"])).toBeNull();
	});

	test("empty mention arrays are absent rather than empty", () => {
		const payload = promptPayloadOf({
			sessionID: "ses_1",
			text: "hi",
			attachments: [],
			mentions: [],
		});
		expect(payload.files).toBeUndefined();
		expect(payload.agents).toBeUndefined();
		expect(payload.skills).toBeUndefined();
	});
});
