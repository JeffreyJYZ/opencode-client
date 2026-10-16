import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { cleanup, screen } from "@testing-library/react";
import { resetActivity } from "@/app/sessionActivity";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { PromptBox } from "@/components/composer/PromptBox";
import { COMPOSER_INTERRUPT_LABEL, COMPOSER_QUEUED_LABEL } from "@/constants/composer";
import { TARGET_GLOBAL } from "@/constants/server";
import { durableSeqOf, sessionIDOf } from "@/session/eventEnvelope";
import { flush } from "@/test/act";
import { capturedFrames, sessionOfType } from "@/test/capture";
import { renderComposer } from "@/test/composer";
import { composerProbe } from "@/test/composerProbe";

/**
 * The "Queued" label (row M2.26). It is the **transcript's** own state — a user row
 * whose `delivery` is `DELIVERY.queued` — not the running flag: a turn with an empty
 * queue is interruptible and not queued. The frames are the captured ones, pushed
 * into the real store through the ingest, so what the label reads is what the
 * reducer wrote.
 */

afterEach(cleanup);

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.shell.ended");
const CONNECTED = frames.find((frame) => frame.type === "server.connected") as V2Event;

/** One captured frame of `type` at `seq` for the fixture session. */
function frame(type: string, seq: number): V2Event {
	const found = frames.find(
		(f) => f.type === type && sessionIDOf(f) === session && durableSeqOf(f) === seq,
	);
	if (found === undefined) throw new Error(`the capture has no ${type}@${seq} for ${session}`);
	return found;
}

/** Mount the composer over a held tab and go live — an empty transcript, running. */
async function mountRunning(): Promise<ReturnType<typeof composerProbe>> {
	const probe = composerProbe();
	openTab(sessionTab(session));
	renderComposer(<PromptBox sessionID={session} running={true} />, probe);
	probe.stream.push(CONNECTED);
	await flush();
	return probe;
}

beforeEach(() => {
	resetTabs();
	resetActivity();
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = {
		url: "http://127.0.0.1:5251",
		password: "pw",
	};
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	resetTabs();
});

describe("the composer's Queued label", () => {
	test("a running turn with an empty queue shows no label", async () => {
		await mountRunning();
		expect(screen.queryByText(COMPOSER_QUEUED_LABEL)).toBeNull();
		// The defect was the label standing in for `running`; interrupt still does.
		expect(screen.getByText(COMPOSER_INTERRUPT_LABEL)).toBeDefined();
	});

	test("a queued prompt shows the label", async () => {
		const probe = await mountRunning();
		probe.stream.push(frame("session.inbox.enqueued", 1));
		await flush();
		expect(screen.getByText(COMPOSER_QUEUED_LABEL)).toBeDefined();
	});

	test("the label clears once the queued prompt is delivered", async () => {
		const probe = await mountRunning();
		probe.stream.push(frame("session.inbox.enqueued", 1));
		await flush();
		expect(screen.getByText(COMPOSER_QUEUED_LABEL)).toBeDefined();
		// The turn is still running (no idle frame) — only the queue empties.
		probe.stream.push(frame("session.execution.started", 3));
		probe.stream.push(frame("session.inbox.delivered", 5));
		await flush();
		expect(screen.queryByText(COMPOSER_QUEUED_LABEL)).toBeNull();
		expect(screen.getByText(COMPOSER_INTERRUPT_LABEL)).toBeDefined();
	});
});
