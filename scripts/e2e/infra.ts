import { existsSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_POLL_MS } from "@/constants/e2e";

/**
 * Process, port and temp-dir plumbing for the scripted browser proof (`scripts/e2e.ts`).
 * Nothing here knows what the proof asserts; it knows how to start a process, find a
 * port nobody holds, wait for a log line, and stop a process by its real PID.
 *
 * Children are held in `children` so Bun does not drop the handle, and every kill is
 * followed by a liveness check — an assumed kill that matched nothing reads as success.
 */

const children: Array<Bun.Subprocess> = [];

/** Run a command to completion; returns its exit code and both streams as text. */
export function run(cmd: string[]): { code: number; out: string; err: string } {
	const result = Bun.spawnSync({ cmd, stdout: "pipe", stderr: "pipe" });
	return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() };
}

/** The PIDs listening on a TCP port, empty when the port is free. */
export function listenersOn(port: number): number[] {
	const { out } = run(["lsof", "-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
	return out
		.split("\n")
		.map((line) => Number.parseInt(line.trim(), 10))
		.filter((pid) => Number.isInteger(pid) && pid > 0);
}

/** The first `count` free ports in the band — a verified-free port, never a guessed one. */
export function freePorts(count: number, first: number, last: number): number[] {
	const picked: number[] = [];
	for (let port = first; port <= last && picked.length < count; port++) {
		if (listenersOn(port).length === 0) picked.push(port);
	}
	return picked;
}

/** Spawn a long-running child, writing its output to `logPath`; returns its PID. */
export function spawnTo(
	cmd: string[],
	logPath: string,
	extraEnv: Record<string, string> = {},
): number {
	const fd = openSync(logPath, "a");
	const child = Bun.spawn({
		cmd,
		env: { ...process.env, ...extraEnv },
		stdout: fd,
		stderr: fd,
	});
	children.push(child);
	return child.pid;
}

/** Wait for a log line to match `pattern`, returning its first capture group. */
export async function waitForMatch(
	logPath: string,
	pattern: RegExp,
	what: string,
	timeoutMs: number,
): Promise<string> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const text = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
		const match = pattern.exec(text);
		if (match?.[1] !== undefined) return match[1];
		if (Date.now() > deadline) {
			throw new Error(`${what} within ${timeoutMs} ms; last log:\n${text.slice(-400)}`);
		}
		await Bun.sleep(E2E_POLL_MS);
	}
}

/** Wait until `url` answers, then return — the app's dev server, not the API's. */
export async function waitForHttp(url: string, what: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
			if (response.ok) return;
		} catch {
			// Not up yet; the deadline decides.
		}
		if (Date.now() > deadline)
			throw new Error(`${what} at ${url} did not answer in ${timeoutMs} ms`);
		await Bun.sleep(E2E_POLL_MS);
	}
}

function isAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/** Stop a PID for good: SIGTERM, a bounded wait, then SIGKILL — never an assumed kill. */
export async function stopPid(pid: number | null): Promise<void> {
	if (pid === null) return;
	try {
		process.kill(pid, "SIGTERM");
	} catch {
		return;
	}
	const deadline = Date.now() + 5_000;
	while (isAlive(pid) && Date.now() < deadline) await Bun.sleep(E2E_POLL_MS);
	if (isAlive(pid)) {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// Gone between the check and the signal.
		}
	}
}

/** A fresh temp root **outside the repo**, which is where every XDG dir will live. */
export function tempRoot(): string {
	return mkdtempSync(join(tmpdir(), "oc-e2e-"));
}

/** Remove the temp root; `force` so a teardown after a half-failed run still succeeds. */
export function removeDir(path: string): void {
	rmSync(path, { recursive: true, force: true });
}
