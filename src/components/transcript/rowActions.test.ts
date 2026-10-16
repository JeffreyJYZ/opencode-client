import { afterEach, describe, expect, test } from "bun:test";
import { getToasts, resetToasts } from "@/components/toast/toastStore";
import { copyToClipboard, openEditorTarget } from "@/components/transcript/rowActions";
import {
	TOAST_COPIED,
	TOAST_COPY_FAILED,
	TOAST_EDITOR_FAILED,
	TOAST_ROLE,
} from "@/constants/native";

/**
 * The two native actions a row runs (M5.2, requirement 3): each answers **out loud**. A
 * copy that worked is a status, one the clipboard refused is an alert, and an editor the
 * shell could not open is an alert — the point being that nothing here fails silently.
 * Under `bun test` the build has no shell, so this is the web path (the browser's own
 * Clipboard API) plus the honest refusal where there is no editor.
 */

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function stubClipboard(value: unknown): void {
	Object.defineProperty(navigator, "clipboard", { configurable: true, value });
}

afterEach(() => {
	resetToasts();
	if (originalClipboard === undefined) delete (navigator as { clipboard?: unknown }).clipboard;
	else Object.defineProperty(navigator, "clipboard", originalClipboard);
});

describe("the row's native actions report their outcome", () => {
	test("a copy the clipboard accepts says so as a status", async () => {
		resetToasts();
		const written: string[] = [];
		stubClipboard({
			writeText: async (value: string) => {
				written.push(value);
			},
		});
		await copyToClipboard("payload");
		expect(written).toEqual(["payload"]);
		// Not the toast's id: it is a process-wide counter, so its value depends on
		// which file ran before this one. The behaviour is the role and the message.
		expect(getToasts()).toHaveLength(1);
		expect(getToasts().at(-1)).toMatchObject({
			role: TOAST_ROLE.status,
			message: TOAST_COPIED,
		});
	});

	test("a clipboard that refuses fails visibly, as an alert", async () => {
		stubClipboard({
			writeText: async () => {
				throw new Error("denied");
			},
		});
		await copyToClipboard("payload");
		expect(getToasts().at(-1)?.message).toBe(TOAST_COPY_FAILED);
		expect(getToasts().at(-1)?.role).toBe(TOAST_ROLE.alert);
	});

	test("no clipboard at all is the same failure, never a throw", async () => {
		stubClipboard(undefined);
		await copyToClipboard("payload");
		expect(getToasts().at(-1)?.message).toBe(TOAST_COPY_FAILED);
	});

	test("with no editor to hand to, the refusal is said out loud", async () => {
		await openEditorTarget({ path: "/tmp/a.ts", line: 3 });
		expect(getToasts().at(-1)?.message).toBe(TOAST_EDITOR_FAILED);
		expect(getToasts().at(-1)?.role).toBe(TOAST_ROLE.alert);
	});
});
