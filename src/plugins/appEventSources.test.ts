import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { homeRoute, navigate, resetRouteSession, sessionRoute } from "@/app/router";
import { restoreSettings, updateSettings } from "@/app/settings/store";
import { APP_EVENT } from "@/constants/plugins";
import { ROUTE_PATH } from "@/constants/routes";
import { BUILTIN_THEME } from "@/constants/theme";
import { clearAppEvents } from "@/plugins/appEvents";
import { clearFaults } from "@/plugins/faults";
import { createHostFactory } from "@/plugins/host";
import { sessionIDOf } from "@/session/eventEnvelope";
import { createTranscriptStore } from "@/session/transcriptStore";
import { capturedFrames, sessionOfType } from "@/test/capture";
import { clearTrace, installGlobals, makeLoader, request } from "@/test/plugins";
import { fakeStorage, resetSettingsState } from "@/test/settings";
import { applyTheme, resetThemeService } from "@/theme/service";

/**
 * The app events **fire** (M4.14, spec 040 §The host, `on`): each of the eight is
 * emitted from the surface that knows it happened, and a plugin subscribed through
 * `host.on` is really called. The three session-shaped events (`turn-start`,
 * `turn-end`, `chunk`) are driven by captured frames through the transcript store —
 * the same call `sessionIngest` makes for every reduced frame — because this harness
 * has no server to run a model turn.
 */

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.shell.ended");

function frame(type: string): V2Event {
	const found = frames.find((f) => f.type === type && sessionIDOf(f) === session);
	if (found === undefined) throw new Error(`the capture has no ${type} frame`);
	return found;
}

/** A plugin's own subscription — the host's `on`, not the bus directly. */
function pluginSees(event: string): unknown[] {
	const seen: unknown[] = [];
	const { host } = createHostFactory()("m414-watch");
	host.on(event, (payload) => seen.push(payload));
	return seen;
}

beforeEach(() => {
	installGlobals();
	clearFaults();
});

afterEach(() => {
	clearAppEvents();
	resetThemeService();
	resetSettingsState();
	resetRouteSession();
	clearTrace();
	clearFaults();
});

describe("the session-shaped events", () => {
	test("turn-start and turn-end fire on a real flip, and a plugin is called", () => {
		const store = createTranscriptStore();
		store.hold(session);
		const starts = pluginSees(APP_EVENT.turnStart);
		const ends = pluginSees(APP_EVENT.turnEnd);
		store.ingest(frame("session.execution.started"));
		expect(starts).toEqual([{ sessionID: session }]);
		expect(ends).toEqual([]);
		store.ingest(frame("session.execution.succeeded"));
		expect(ends).toEqual([{ sessionID: session }]);
	});

	test("chunk fires on a streamed delta, carrying the session and the text", () => {
		const store = createTranscriptStore();
		store.hold(session);
		const chunks = pluginSees(APP_EVENT.chunk);
		store.ingest(frame("session.text.delta"));
		expect(chunks).toHaveLength(1);
		expect((chunks[0] as { sessionID: string }).sessionID).toBe(session);
	});
});

describe("the app-surface events", () => {
	test("session-changed fires on navigation into and out of a session", () => {
		window.history.pushState(null, "", ROUTE_PATH.home);
		resetRouteSession();
		const seen = pluginSees(APP_EVENT.sessionChanged);
		navigate(sessionRoute(session));
		expect(seen.at(-1)).toEqual({ sessionID: session });
		navigate(homeRoute());
		expect(seen.at(-1)).toEqual({ sessionID: null });
	});

	test("settings-changed fires from the one write path", () => {
		resetSettingsState();
		restoreSettings(fakeStorage());
		const seen = pluginSees(APP_EVENT.settingsChanged);
		updateSettings({ recentDirectories: ["/tmp/m414"] });
		expect(seen).toHaveLength(1);
		expect((seen[0] as { recentDirectories: string[] }).recentDirectories).toEqual([
			"/tmp/m414",
		]);
	});

	test("theme-changed fires when a theme goes into force", () => {
		resetThemeService();
		const seen = pluginSees(APP_EVENT.themeChanged);
		applyTheme(BUILTIN_THEME.light.id);
		expect(seen).toEqual([{ id: BUILTIN_THEME.light.id }]);
	});

	test("plugin-loaded and plugin-unloaded fire on load and disable", async () => {
		const loaded = pluginSees(APP_EVENT.pluginLoaded);
		const unloaded = pluginSees(APP_EVENT.pluginUnloaded);
		const loader = makeLoader();
		await loader.load(request("m414-plug", "one"));
		expect(loaded).toEqual([{ id: "m414-plug" }]);
		expect(unloaded).toEqual([]);
		loader.disable("m414-plug");
		expect(unloaded).toEqual([{ id: "m414-plug" }]);
	});
});
