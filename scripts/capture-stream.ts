#!/usr/bin/env bun
import { OpenCode } from "@opencode/client";
import { AUTH_USERNAME } from "@/constants/server";

/**
 * Capture real SSE frames from an opencode server into a JSONL file, so a test
 * fixture is the shape a server really emits rather than a remembered one.
 *
 *   bun scripts/capture-stream.ts <url> <password> <out.jsonl> <seconds>
 *
 * Run it against a **throwaway** server — never the registered one, which hosts
 * live sessions. The isolated recipe (all four XDG dirs outside the repo, so
 * nothing under `~/.local/state/opencode/` is read or written):
 *
 *   XDG_DATA_HOME=$T/data XDG_STATE_HOME=$T/state \
 *   XDG_CONFIG_HOME=$T/config XDG_CACHE_HOME=$T/cache \
 *   OPENCODE_PASSWORD=<pw> opencode serve --hostname 127.0.0.1 --port <port>
 *
 * The script drives the same client seam the app uses (`@opencode/client`), so
 * the captured envelopes are the ones the app will receive. It creates one
 * session and emits four things a credential-less server can still produce: a
 * seeded prompt (`resume: false`, inbox events only), a real turn (execution /
 * step / text / reasoning / usage, and a failure frame when no model is usable),
 * and a shell command (`session.shell.started` / `.ended` with the paged
 * `output.output`). The whole capture is written even when a step rejects.
 */
const [url, password, out, seconds] = process.argv.slice(2);
if (!url || !password || !out || !seconds) {
	console.error("usage: capture-stream.ts <url> <password> <out.jsonl> <seconds>");
	process.exit(2);
}

const auth = Buffer.from(`${AUTH_USERNAME}:${password}`).toString("base64");
const client = OpenCode.make({ baseUrl: url, headers: { Authorization: `Basic ${auth}` } });

const lines: string[] = [];
const controller = new AbortController();

async function drive(): Promise<void> {
	const created = await client.session.create({} as never);
	const sessionID = (created as { id: string }).id;
	// 1. Seeded without a model: durable inbox frames, no turn.
	await client.session.prompt({ sessionID, text: "seeded, no model", resume: false } as never);
	// 2. A real turn: execution / step / content frames (a failure frame when the
	//    server has no usable credential).
	try {
		await client.session.prompt({ sessionID, text: "hello" } as never);
	} catch (error) {
		console.error("turn rejected:", (error as Error).message);
	}
	// 3. A shell command: the one content family that arrives whole.
	try {
		await client.session.shell({ sessionID, command: "printf 'captured\\n'" } as never);
	} catch (error) {
		console.error("shell rejected:", (error as Error).message);
	}
}

void drive().catch((error: unknown) => console.error("drive failed:", (error as Error).message));
const deadline = setTimeout(() => controller.abort(), Number(seconds) * 1000);
try {
	for await (const event of client.event.subscribe({ signal: controller.signal })) {
		lines.push(JSON.stringify(event));
	}
} catch {
	// The abort lands here; the capture is what arrived before it.
} finally {
	clearTimeout(deadline);
	await Bun.write(out, `${lines.join("\n")}\n`);
	console.log(`captured ${lines.length} frames into ${out}`);
}
