import type { V2Event } from "@opencode/client";

/**
 * The event envelope, read structurally (spec 050 §Event ingest; `docs/opencode-api.md` §2).
 *
 * The generated `V2Event` union is exact and is what every reducer narrows on, but
 * these three facts are *envelope* facts, true of every frame, and three separate
 * readers need them before they know the type: which session a frame belongs to
 * (the stream carries every session, so the filter must see it first), whether the
 * frame is durable and at which `seq`, and when it was created.
 *
 * **The one cast in the ingest**, kept in one function so a change to the envelope
 * has one place to land.
 */

export type EventEnvelope = {
	readonly id: string;
	readonly type: string;
	readonly created?: number;
	readonly durable?: { readonly seq?: number };
	readonly data?: { readonly sessionID?: unknown };
};

/** The envelope of one frame. `server.connected` carries no `created` and no `durable`. */
export function envelopeOf(event: V2Event): EventEnvelope {
	return event as unknown as EventEnvelope;
}

/** The session a frame belongs to, or `undefined` for a frame that carries none. */
export function sessionIDOf(event: V2Event): string | undefined {
	const sessionID = envelopeOf(event).data?.sessionID;
	return typeof sessionID === "string" ? sessionID : undefined;
}

/**
 * The frame's durable sequence number, or `null` when it is volatile.
 *
 * Measured (captured, `src/test/fixtures/m21-stream.jsonl`): `durable.aggregateID`
 * is the **session**, and `seq` rises monotonically across every durable frame of
 * that session — `0,1,2,3,5,6,7,8,9` … `27` — so one watermark per transcript is a
 * correct staleness test for all of them.
 */
export function durableSeqOf(event: V2Event): number | null {
	const seq = envelopeOf(event).durable?.seq;
	return typeof seq === "number" ? seq : null;
}

/** When the frame was created, or `0` (the keepalive-style frames carry none). */
export function createdAtOf(event: V2Event): number {
	return envelopeOf(event).created ?? 0;
}
