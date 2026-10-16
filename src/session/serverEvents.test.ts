import { afterEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import {
	clearServerEvents,
	publishServerEvent,
	subscribeToServerEvents,
} from "@/session/serverEvents";

/**
 * The server-event fan-out (M4.10): the ingest publishes every frame here and a
 * plugin's host subscribes; a subscriber is told each frame, and an unsubscribe
 * stops it.
 */

afterEach(() => {
	clearServerEvents();
});

function frame(type: string): V2Event {
	return { type } as unknown as V2Event;
}

describe("the server-event fan-out", () => {
	test("a subscriber receives every published frame in order", () => {
		const seen: string[] = [];
		subscribeToServerEvents((event) => seen.push(event.type));
		publishServerEvent(frame("session.updated"));
		publishServerEvent(frame("message.part"));
		expect(seen).toEqual(["session.updated", "message.part"]);
	});

	test("an unsubscribe stops the frames", () => {
		const seen: string[] = [];
		const off = subscribeToServerEvents((event) => seen.push(event.type));
		publishServerEvent(frame("a"));
		off();
		publishServerEvent(frame("b"));
		expect(seen).toEqual(["a"]);
	});

	test("two subscribers both see a frame; one leaving does not affect the other", () => {
		const first: string[] = [];
		const second: string[] = [];
		const off = subscribeToServerEvents((event) => first.push(event.type));
		subscribeToServerEvents((event) => second.push(event.type));
		publishServerEvent(frame("x"));
		off();
		publishServerEvent(frame("y"));
		expect(first).toEqual(["x"]);
		expect(second).toEqual(["x", "y"]);
	});
});
