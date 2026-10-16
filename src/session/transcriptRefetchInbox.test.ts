import { describe, expect, test } from "bun:test";
import type {
	OpenCodeClient,
	SessionInboxInfo,
	SessionMessageInfo,
	SessionMessagesResponse,
	V2Event,
} from "@opencode/client";
import { DELIVERY, ROW_KIND } from "@/constants/transcript";
import { emptyTranscript } from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { refetchTranscript } from "@/session/transcriptRefetch";
import { capturedMessages } from "@/test/capture";

/**
 * M2.31: a queued prompt is invisible after reload. The refetch lists the
 * pending inbox alongside the messages and seeds one queued user row per
 * pending user entry — keyed by the inbox id, so the later `delivered` frame
 * updates it instead of adding a second row. The user message below is captured
 * (`m21-messages.json`); the inbox entries are hand-built, because no capture
 * holds a pending inbox (a capture is taken after delivery).
 */

const sessionID = "ses_queued";
const entryID = "msg_queued1";

const captured = (await capturedMessages()) as Record<string, SessionMessagesResponse>;
const userMessage = Object.values(captured)
	.flatMap((page) => page.data)
	.find((message) => message.type === "user") as SessionMessageInfo;

function userEntry(text: string): SessionInboxInfo {
	return {
		id: entryID,
		sessionID,
		time: { created: 1_792_072_598_505 },
		type: "user",
		payload: { text },
		delivery: "steer",
	} as SessionInboxInfo;
}

/** `entries: null` is a failed inbox read; the message list always succeeds. */
function withInbox(
	messages: readonly SessionMessageInfo[],
	entries: readonly SessionInboxInfo[] | null,
): OpenCodeClient {
	return {
		message: { list: async () => ({ data: [...messages] }) },
		session: {
			inbox: {
				list: async () => {
					if (entries === null) throw new Error("boom");
					return [...entries];
				},
			},
		},
	} as unknown as OpenCodeClient;
}

describe("refetchTranscript — pending inbox", () => {
	test("a pending user entry seeds one queued row at the tail, keyed by inbox id", async () => {
		const rows = await refetchTranscript(
			withInbox([userMessage], [userEntry("hello?")]),
			sessionID,
		);
		expect(rows?.map((row) => row.id)).toEqual([userMessage.id, entryID]);
		expect(rows?.[1]).toMatchObject({
			kind: ROW_KIND.user,
			text: "hello?",
			delivery: DELIVERY.queued,
		});
	});

	test("a non-user inbox entry renders nothing", async () => {
		const synthetic = { ...userEntry("shell did this"), type: "synthetic" } as SessionInboxInfo;
		expect(await refetchTranscript(withInbox([], [synthetic]), sessionID)).toEqual([]);
	});

	test("a failed inbox read keeps the message rows", async () => {
		const rows = await refetchTranscript(withInbox([userMessage], null), sessionID);
		expect(rows?.map((row) => row.id)).toEqual([userMessage.id]);
	});

	test("the later delivery updates the seeded row rather than doubling it", async () => {
		const rows =
			(await refetchTranscript(withInbox([], [userEntry("hello?")]), sessionID)) ?? [];
		let transcript = { ...emptyTranscript(sessionID), rows };
		const delivered = {
			id: "evt_delivered1",
			type: "session.inbox.delivered",
			data: { sessionID, inboxID: entryID },
		} as unknown as V2Event;
		transcript = reduceTranscript(transcript, delivered) ?? transcript;
		const seeded = transcript.rows.filter((row) => row.id === entryID);
		expect(seeded).toHaveLength(1);
		expect(seeded[0]).toMatchObject({ kind: ROW_KIND.user, delivery: DELIVERY.delivered });
	});
});
