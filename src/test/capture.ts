import type {
	FormInfo,
	PermissionRequest,
	SessionMessagesResponse,
	V2Event,
} from "@opencode/client";
import { sessionIDOf } from "@/session/eventEnvelope";

/**
 * The captured fixtures (M2.1): the frames a real server sent and the message lists
 * it answered with, both verbatim — see `src/test/fixtures/README.md` for how they
 * were taken and what they deliberately contain.
 *
 * Never hand-shape a frame for a test: a fixture that models a shape the server
 * cannot send proves nothing, and that mistake hid a real defect in M1.4.
 */

const FIXTURE_DIR = "./fixtures";

/** The captured frames, as `event.subscribe` yielded them, in capture order. */
export async function capturedFrames(): Promise<V2Event[]> {
	const text = await Bun.file(new URL(`${FIXTURE_DIR}/m21-stream.jsonl`, import.meta.url)).text();
	return text
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as V2Event);
}

/** The captured `message.list` responses, keyed by session id. */
export async function capturedMessages(): Promise<Record<string, SessionMessagesResponse>> {
	const text = await Bun.file(
		new URL(`${FIXTURE_DIR}/m21-messages.json`, import.meta.url),
	).text();
	return JSON.parse(text) as Record<string, SessionMessagesResponse>;
}

/** The session that emitted the first frame of `type` — how a test names its data. */
export function sessionOfType(frames: readonly V2Event[], type: string): string {
	for (const frame of frames) if (frame.type === type) return sessionIDOf(frame) as string;
	throw new Error(`the capture has no ${type} frame`);
}

/** The captured dock fixtures (M2.6): the two list responses and the two cue frames. */
export type DocksFixture = {
	readonly sessionID: string;
	readonly permissions: readonly PermissionRequest[];
	readonly forms: readonly FormInfo[];
};

/** The pending permission and form a real server answered with (see the fixtures README). */
export async function capturedDocks(): Promise<DocksFixture> {
	return JSON.parse(
		await Bun.file(new URL(`${FIXTURE_DIR}/m25-docks.json`, import.meta.url)).text(),
	) as DocksFixture;
}

/** The two cue frames (`permission.asked`, `form.created`) a real server emitted. */
export async function capturedDockFrames(): Promise<V2Event[]> {
	const text = await Bun.file(
		new URL(`${FIXTURE_DIR}/m25-docks-frames.jsonl`, import.meta.url),
	).text();
	return text
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as V2Event);
}

/** Every session the captured stream carries: the stream is not session-scoped. */
export function sessionIDsOf(frames: readonly V2Event[]): string[] {
	const ids = new Set<string>();
	for (const frame of frames) {
		const id = sessionIDOf(frame);
		if (id !== undefined) ids.add(id);
	}
	return [...ids];
}
