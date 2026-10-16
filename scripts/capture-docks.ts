#!/usr/bin/env bun
import { OpenCode } from "@opencode/client";
import { AUTH_USERNAME } from "@/constants/server";

/**
 * Capture the **docks'** two list responses and the frames that cue them (M2.6), so
 * the dock tests and the dock fixture read the server's own shapes rather than a
 * remembered one (the rule M1.4's defect earned).
 *
 *   bun scripts/capture-docks.ts <url> <password> <out.json> <frames.jsonl> <seconds>
 *
 * Run against a **throwaway** server (all four XDG dirs redirected). Two things it
 * must produce that this app cannot ask for itself:
 *
 * 1. A **question form** — `session.form.create`, a real client method.
 * 2. A **pending permission request**. The route exists
 *    (`POST /api/session/:id/permission`) but the pinned client exposes no create
 *    method for it — only list/get/reply — so the request is raised with one
 *    documented `fetch` to that route. That is **proof seeding**, not app code: the
 *    app never calls it, and the dock only ever reads the list and replies.
 */

const [url, password, out, framesOut, seconds] = process.argv.slice(2);
if (!url || !password || !out || !framesOut || !seconds) {
	console.error("usage: capture-docks.ts <url> <password> <out.json> <frames.jsonl> <seconds>");
	process.exit(2);
}

/**
 * The action the seeded request asks about, and the throwaway directory the session
 * lives in. The isolated server's config gives this action `effect: "ask"` (every
 * other action its default ruleset allows, so no request is ever created); the
 * directory keeps the proof out of the repo.
 */
const action = "m25probe";
const directory = process.env.M25_DIRECTORY ?? "/tmp";

const authorization = `Basic ${Buffer.from(`${AUTH_USERNAME}:${password}`).toString("base64")}`;
const client = OpenCode.make({ baseUrl: url, headers: { Authorization: authorization } });
const frames: string[] = [];
const controller = new AbortController();

async function consume(): Promise<void> {
	for await (const event of client.event.subscribe({ signal: controller.signal })) {
		if (event.type.startsWith("permission.") || event.type.startsWith("form.")) {
			frames.push(JSON.stringify(event));
		}
	}
}

async function drive(): Promise<string> {
	const created = await client.session.create({
		location: { directory },
	} as never);
	const sessionID = (created as { id: string }).id;
	await client.session.form.create({
		sessionID,
		title: "Which files should change?",
		fields: [
			{ key: "target", type: "string", title: "Target", placeholder: "src/…" },
			{
				key: "scope",
				type: "multiselect",
				title: "Scope",
				options: [
					{ value: "tests", label: "Tests" },
					{ value: "docs", label: "Docs" },
				],
			},
		],
	} as never);
	const response = await fetch(`${url}/api/session/${sessionID}/permission`, {
		method: "POST",
		headers: { Authorization: authorization, "Content-Type": "application/json" },
		body: JSON.stringify({
			action: action,
			resources: ["/tmp/m25-target"],
			source: { type: "tool", messageID: "msg_seed", id: "part_seed" },
		}),
	});
	console.error("permission seed:", response.status, await response.text());
	return sessionID;
}

void (async () => {
	// Subscribe **first**: the frames cue the docks, and a frame emitted before the
	// subscription exists is gone (the stream is not replayable).
	const consuming = consume();
	const sessionID = await drive();
	setTimeout(() => controller.abort(), Number(seconds) * 1000);
	await consuming.catch(() => undefined);
	const [permissions, forms] = await Promise.all([
		client.permission.list({ sessionID }),
		client.session.form.list({ sessionID }),
	]);
	await Bun.write(out, JSON.stringify({ sessionID, permissions, forms }, null, 2));
	await Bun.write(framesOut, `${frames.join("\n")}\n`);
	console.error(`captured ${permissions.length} permission(s), ${forms.length} form(s)`);
})();
