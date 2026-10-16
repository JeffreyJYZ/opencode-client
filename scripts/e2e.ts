#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	E2E_BROWSER_SESSION,
	E2E_COVERS,
	E2E_NOT_COVERS,
	E2E_PORT_FIRST,
	E2E_PORT_LAST,
	E2E_READY_TIMEOUT_MS,
	E2E_SESSION_DIR,
	E2E_TARGET_URL_ENV,
} from "@/constants/e2e";
import { SESSION_PATH_PREFIX } from "@/constants/routes";
import { closeBrowser, evalBool, openPage, pageErrors, writeInitScript } from "./e2e/browser";
import { homeChecks, sessionChecks } from "./e2e/checks";
import {
	freePorts,
	listenersOn,
	removeDir,
	spawnTo,
	stopPid,
	tempRoot,
	waitForHttp,
} from "./e2e/infra";
import { seedSession, sessionDirectory, startIsolatedServer } from "./e2e/isolated";

/**
 * `bun run e2e` — the scripted browser proof (M0.1), one command and no arguments.
 *
 * It spawns an **isolated** opencode server (its own process, its own port, all four
 * XDG dirs under a temp root outside the repo), seeds one root session in a throwaway
 * directory — a `session.create`, never a model turn — serves the app from a dev server
 * in the proof's own port band, and drives it with `agent-browser` in a private
 * session. Then it prints one verdict line and exits non-zero on any gap.
 *
 * Set `E2E_TARGET_URL` to point the injected target at another url; a dead one must
 * fail the run, which is how the gate itself is proven rather than asserted.
 *
 * A green run does **not** prove: any model turn or streaming, the docks, keyboard
 * chords, the Tauri shell/webview, themes, plugins, or a packaged build.
 */

const gaps: string[] = [];
const ports: number[] = [];
const pids: number[] = [];
let root: string | null = null;
let ran = 0;

function check(label: string, ok: boolean): void {
	ran++;
	if (!ok) gaps.push(label);
}

async function teardown(): Promise<void> {
	closeBrowser();
	for (const pid of pids) await stopPid(pid);
	// `bun run dev` spawns vite as a child, so the real listener is stopped by its port.
	for (const port of ports) for (const pid of listenersOn(port)) await stopPid(pid);
	for (const port of ports) {
		const held = listenersOn(port);
		if (held.length > 0) gaps.push(`port ${port} still held by PID ${held.join(", ")}`);
	}
	if (root !== null) {
		removeDir(root);
		if (existsSync(root)) gaps.push(`the temp dir ${root} survived teardown`);
	}
}

async function main(): Promise<void> {
	root = tempRoot();
	const [serverPort, appPort] = freePorts(2, E2E_PORT_FIRST, E2E_PORT_LAST);
	if (serverPort === undefined || appPort === undefined) {
		throw new Error(`no two free ports in ${E2E_PORT_FIRST}-${E2E_PORT_LAST}`);
	}
	ports.push(serverPort, appPort);

	const server = await startIsolatedServer(root, serverPort);
	pids.push(server.pid);
	const sessionID = await seedSession(
		server.url,
		server.password,
		sessionDirectory(root, E2E_SESSION_DIR),
	);

	pids.push(
		spawnTo(
			["bun", "run", "dev", "--host", "127.0.0.1", "--port", String(appPort), "--strictPort"],
			join(root, "app.log"),
		),
	);
	const appUrl = `http://127.0.0.1:${appPort}`;
	await waitForHttp(`${appUrl}/`, "the app dev server", E2E_READY_TIMEOUT_MS);

	const targetUrl = process.env[E2E_TARGET_URL_ENV] ?? server.url;
	const initScript = join(root, "init.js");
	await writeInitScript(initScript, targetUrl, server.password);

	openPage(`${appUrl}/`, initScript);
	for (const one of homeChecks(targetUrl)) check(one.label, evalBool(one.expression));
	openPage(`${appUrl}${SESSION_PATH_PREFIX}${sessionID}`, initScript);
	for (const one of sessionChecks(sessionID)) check(one.label, evalBool(one.expression));

	const errors = pageErrors();
	check(`no page errors (saw: ${errors === "" ? "none" : errors})`, errors === "");
}

try {
	await main();
} catch (error) {
	gaps.push(`the run threw: ${error instanceof Error ? error.message : String(error)}`);
} finally {
	try {
		await teardown();
	} catch (error) {
		gaps.push(`teardown threw: ${error instanceof Error ? error.message : String(error)}`);
	}
}

if (gaps.length === 0) {
	console.log(
		`e2e: PASS — ${ran} checks, ports ${ports.join("/")}, browser session ${E2E_BROWSER_SESSION}`,
	);
} else {
	console.log(`e2e: FAIL — ${gaps.length} gap(s): ${gaps.join("; ")}`);
}
console.log(`e2e: covers — ${E2E_COVERS}`);
console.log(`e2e: not covered — ${E2E_NOT_COVERS}`);
process.exit(gaps.length === 0 ? 0 : 1);
