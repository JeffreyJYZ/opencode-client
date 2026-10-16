import { describe, expect, test } from "bun:test";
import type { OpenCodeClient } from "@opencode/client";
import { COMPOSER_SEND_FAILED } from "@/constants/composer";
import {
	cancelForm,
	interruptSession,
	replyForm,
	replyPermission,
	sendPrompt,
} from "@/session/actions";

/**
 * The seam (M2.5/M2.6, spec 050 §Sessions, commands, replies). Every assertion is
 * about **what reaches the client**: the flat prompt payload with no wrapper (the
 * cast in `actions.ts` is type-level only), the interrupt's own input, the three
 * permission decisions exactly as the wire spells them, and a form reply carrying
 * the form's own answer shape.
 */

type Recorder = {
	readonly client: OpenCodeClient;
	readonly calls: Record<string, unknown[]>;
};

function recorder(fail?: "prompt" | "permission" | "interrupt"): Recorder {
	const calls: Record<string, unknown[]> = {};
	const push = (name: string, input: unknown) => {
		calls[name] = [...(calls[name] ?? []), input];
	};
	const reject = (name: "prompt" | "permission" | "interrupt") => {
		if (fail === name) throw new Error("refused");
	};
	const client = {
		session: {
			prompt: async (input: unknown) => {
				push("prompt", input);
				reject("prompt");
			},
			interrupt: async (input: unknown) => {
				push("interrupt", input);
				reject("interrupt");
			},
			form: {
				reply: async (input: unknown) => push("form.reply", input),
				cancel: async (input: unknown) => push("form.cancel", input),
			},
		},
		permission: {
			reply: async (input: unknown) => {
				push("permission.reply", input);
				reject("permission");
			},
		},
	} as unknown as OpenCodeClient;
	return { client, calls };
}

const BASE = { sessionID: "ses_1", text: "hello", attachments: [], mentions: [] };

describe("the send path", () => {
	test("sends the flat payload, one seam, exactly as the wire wants it", async () => {
		const { client, calls } = recorder();
		await sendPrompt(client, {
			...BASE,
			attachments: [{ uri: "file:///tmp/a.png", sendable: true }],
			mentions: [{ kind: "agent", start: 0, end: 6, text: "@Build", value: "Build" }],
		});
		expect(calls.prompt).toEqual([
			{
				sessionID: "ses_1",
				text: "hello",
				files: [{ uri: "file:///tmp/a.png" }],
				agents: [{ name: "Build", mention: { start: 0, end: 6, text: "@Build" } }],
			},
		]);
	});

	test("a refused prompt rejects so the box can keep the text (never a silent failure)", async () => {
		const { client } = recorder("prompt");
		let caught: unknown = null;
		try {
			await sendPrompt(client, BASE);
		} catch (error) {
			caught = error;
		}
		expect(caught).toBeInstanceOf(Error);
		expect(COMPOSER_SEND_FAILED).toBe("Prompt not sent");
	});
});

describe("the interrupt", () => {
	test("interrupts the session it was given, gated by the caller", async () => {
		const { client, calls } = recorder();
		await interruptSession(client, "ses_1");
		expect(calls.interrupt).toEqual([{ sessionID: "ses_1" }]);
	});
});

describe("the docks' replies", () => {
	test("a permission reply carries `decision`, one of the wire's three words", async () => {
		const { client, calls } = recorder();
		for (const decision of ["once", "always", "reject"] as const) {
			await replyPermission(client, { sessionID: "ses_1", requestID: "per_1", decision });
		}
		expect(calls["permission.reply"]).toEqual([
			{ sessionID: "ses_1", requestID: "per_1", decision: "once" },
			{ sessionID: "ses_1", requestID: "per_1", decision: "always" },
			{ sessionID: "ses_1", requestID: "per_1", decision: "reject" },
		]);
	});

	test("a form reply sends the form's own answer shape", async () => {
		const { client, calls } = recorder();
		await replyForm(client, {
			sessionID: "ses_1",
			formID: "frm_1",
			answer: { target: "src/", scope: ["tests"] },
		});
		expect(calls["form.reply"]).toEqual([
			{ sessionID: "ses_1", formID: "frm_1", answer: { target: "src/", scope: ["tests"] } },
		]);
	});

	test("cancelling a form is its own call, so the asker is told", async () => {
		const { client, calls } = recorder();
		await cancelForm(client, { sessionID: "ses_1", formID: "frm_1" });
		expect(calls["form.cancel"]).toEqual([{ sessionID: "ses_1", formID: "frm_1" }]);
	});
});
