import { describe, expect, test } from "bun:test";
import { CLIENT_COMMAND_NAMES, CLIENT_COMMANDS } from "@/app/clientCommands";
import { COMPOSER_MENTION_KIND, COMPOSER_SOURCE } from "@/constants/composer";
import { buildCommandEntries, buildMentionEntries } from "@/session/composerEntries";
import {
	entryEffect,
	filterComposerEntries,
	menuToken,
	moveIndex,
} from "@/session/composerMenuModel";

/**
 * The composer menu's model (M2.5). Three rules matter and each is asserted here
 * rather than through the DOM: **a client command and a server command that share a
 * name are two distinguishable rows**, **the arrows clamp instead of wrapping**, and
 * **accepting a row means two different things** (server: insert and send nothing;
 * client: run here and insert nothing).
 */

const SERVER = [
	{ name: "hello", description: "Say hello" },
	// The same name the app's own client command claims: the disambiguation case.
	{ name: CLIENT_COMMAND_NAMES.settings, description: "Server settings command" },
];

describe("the composer menu's entries", () => {
	test("a name both the app and the server claim yields two labelled rows", () => {
		const entries = buildCommandEntries(CLIENT_COMMANDS, SERVER);
		const settings = entries.filter((entry) => entry.label.includes("settings"));
		expect(settings.length).toBeGreaterThanOrEqual(2);
		const sources = new Set(settings.map((entry) => entry.source));
		expect(sources.has(COMPOSER_SOURCE.client)).toBe(true);
		expect(sources.has(COMPOSER_SOURCE.server)).toBe(true);
		// Only the server row inserts: the client row runs in the app.
		expect(settings.find((entry) => entry.source === COMPOSER_SOURCE.server)?.insert).toBe(
			`/${CLIENT_COMMAND_NAMES.settings} `,
		);
		expect(
			settings.find((entry) => entry.source === COMPOSER_SOURCE.client)?.insert,
		).toBeNull();
	});

	test("a server command row inserts `/<name> ` and carries no client runner", () => {
		const hello = buildCommandEntries(CLIENT_COMMANDS, SERVER).find(
			(entry) => entry.id === "server:hello",
		);
		expect(hello?.insert).toBe("/hello ");
		expect(hello?.clientCommand).toBeUndefined();
		expect(hello?.label).toBe("Say hello");
	});

	test("mention rows name their source and their insert", () => {
		const entries = buildMentionEntries({
			files: [{ path: "src/a.ts", type: "file" }],
			agents: [{ name: "Build" }] as never,
			skills: [{ id: "tdd", name: "tdd" }] as never,
		});
		expect(entries.map((entry) => entry.source)).toEqual([
			COMPOSER_MENTION_KIND.file,
			COMPOSER_MENTION_KIND.agent,
			COMPOSER_MENTION_KIND.skill,
		]);
		expect(entries[0]?.insert).toBe("@src/a.ts ");
		expect(entries[0]?.mention).toEqual({ kind: "file", value: "src/a.ts" });
	});

	test("a prefix match ranks above a substring match", () => {
		const entries = buildCommandEntries(CLIENT_COMMANDS, SERVER);
		const matches = filterComposerEntries(entries, "hel");
		expect(matches[0]?.id).toBe("server:hello");
		expect(filterComposerEntries(entries, "sett")).not.toHaveLength(0);
	});
});

describe("the menu's token", () => {
	test("a word-initial trigger opens it; a slash inside a word does not", () => {
		expect(menuToken("/he", 3)).toEqual({ trigger: "/", query: "he", start: 0, end: 3 });
		expect(menuToken("see src/a.ts", 12)).toBeNull();
		expect(menuToken("hi @bu", 6)).toEqual({ trigger: "@", query: "bu", start: 3, end: 6 });
		expect(menuToken("plain text", 10)).toBeNull();
	});
});

describe("the menu's highlight", () => {
	test("arrows clamp at both ends and never wrap", () => {
		expect(moveIndex(0, 3, -1)).toBe(0);
		expect(moveIndex(2, 3, 1)).toBe(2);
		expect(moveIndex(1, 3, 1)).toBe(2);
		expect(moveIndex(0, 0, 1)).toBe(0);
	});
});

describe("accepting a row", () => {
	const token = menuToken("/hel", 4);

	test("a server command replaces its token and sends nothing", () => {
		const entry = buildCommandEntries(CLIENT_COMMANDS, SERVER).find(
			(candidate) => candidate.id === "server:hello",
		);
		const effect = entryEffect("/hel", token as never, entry as never);
		expect(effect.text).toBe("/hello ");
		expect(effect.runClientCommand).toBeNull();
		expect(effect.mention).toBeNull();
	});

	test("a client command deletes its token and runs here", () => {
		const entry = buildCommandEntries(CLIENT_COMMANDS, SERVER).find(
			(candidate) => candidate.clientCommand === CLIENT_COMMAND_NAMES.palette,
		);
		const typed = `/${CLIENT_COMMAND_NAMES.palette}`;
		const effect = entryEffect(typed, menuToken(typed, typed.length) as never, entry as never);
		expect(effect.text).toBe("");
		expect(effect.runClientCommand).toBe(CLIENT_COMMAND_NAMES.palette);
	});

	test("a mention records the span the payload will carry", () => {
		const entry = buildMentionEntries({
			files: [{ path: "src/a.ts", type: "file" }],
			agents: [],
			skills: [],
		})[0];
		const mentionToken = menuToken("see @src", 8);
		const effect = entryEffect("see @src", mentionToken as never, entry as never);
		expect(effect.text).toBe("see @src/a.ts ");
		expect(effect.mention).toEqual({
			kind: "file",
			value: "src/a.ts",
			start: 4,
			end: 13,
			text: "@src/a.ts",
		});
	});
});
