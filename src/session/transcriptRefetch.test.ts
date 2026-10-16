import { describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionMessageInfo, SessionMessagesResponse } from "@opencode/client";
import { DELIVERY, ROW_KIND } from "@/constants/transcript";
import { capPayload } from "@/session/payloadCaps";
import { refetchTranscript } from "@/session/transcriptRefetch";
import { rowsFromMessage } from "@/session/transcriptRows";
import { capturedMessages } from "@/test/capture";

/**
 * The refetch bridge, against the server's own messages: `m21-messages.json` is a
 * captured `GET /api/session/:id/message?order=desc&limit=50`.
 */

const captured = (await capturedMessages()) as Record<string, SessionMessagesResponse>;
const withShell = Object.keys(captured).find((id) =>
	captured[id].data.some((message) => message.type === "shell"),
) as string;
const messages = captured[withShell].data;
const one = (type: string): SessionMessageInfo => {
	const message = messages.find((candidate) => candidate.type === type);
	if (message === undefined) throw new Error(`the capture has no ${type} message`);
	return message;
};

describe("rowsFromMessage", () => {
	test("a user message is a delivered user row with the server's text", () => {
		const message = one("user");
		const rows = rowsFromMessage(message);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			id: message.id,
			kind: ROW_KIND.user,
			text: (message as { text: string }).text,
			delivery: DELIVERY.delivered,
		});
	});

	test("a shell message keys its row on `shellID`, as the stream does", () => {
		const message = one("shell") as Extract<SessionMessageInfo, { type: "shell" }>;
		expect(rowsFromMessage(message)[0]).toMatchObject({
			id: message.shellID,
			kind: ROW_KIND.shell,
			command: message.command,
			output: capPayload(message.output?.output ?? ""),
		});
	});

	test("an assistant message is its parts in order plus the footer", () => {
		const message = one("assistant") as Extract<SessionMessageInfo, { type: "assistant" }>;
		const rows = rowsFromMessage(message);
		expect(message.content.map((part) => part.type)).toEqual(["reasoning", "text"]);
		expect(rows.map((row) => row.kind)).toEqual([
			ROW_KIND.reasoning,
			ROW_KIND.prose,
			ROW_KIND.footer,
		]);
		// Ordinal counts **within a family**: the captured content is
		// `[reasoning, text]` and both stream frames carry `ordinal: 0`.
		expect(rows.map((row) => row.id)).toEqual([
			`${message.id}:r0`,
			`${message.id}:t0`,
			`${message.id}:f`,
		]);
		expect(rows[0]).toMatchObject({
			text: { kept: (message.content[0] as { text: string }).text },
		});
	});

	test("an assistant message's text rows carry the message's agent", () => {
		const message = one("assistant") as Extract<SessionMessageInfo, { type: "assistant" }>;
		const rows = rowsFromMessage(message);
		// The head's source is the message itself — the same read the footer makes.
		expect(rows[0]).toMatchObject({ kind: ROW_KIND.reasoning, agent: message.agent });
		expect(rows[1]).toMatchObject({ kind: ROW_KIND.prose, agent: message.agent });
	});

	test("a kind with no row here renders nothing", () => {
		expect(rowsFromMessage(one("idle"))).toHaveLength(0);
	});
});

describe("refetchTranscript", () => {
	function client(): OpenCodeClient {
		return {
			message: { list: async () => captured[withShell] },
		} as unknown as OpenCodeClient;
	}

	test("the page is reversed into chronological order", async () => {
		// The captured page is `desc`: its newest row is the idle message.
		expect(messages[0].type).toBe("idle");
		const rows = await refetchTranscript(client(), withShell);
		expect(rows?.[0].kind).toBe(ROW_KIND.user);
		expect(rows?.at(-1)?.kind).toBe(ROW_KIND.footer);
	});

	test("a failed refetch returns null rather than emptying the transcript", async () => {
		const failing = {
			message: {
				list: async () => {
					throw new Error("boom");
				},
			},
		} as unknown as OpenCodeClient;
		expect(await refetchTranscript(failing, withShell)).toBeNull();
	});
});
