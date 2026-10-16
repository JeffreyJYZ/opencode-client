import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { OpenCode } from "@opencode/client";
import { E2E_PASSWORD_RE, E2E_POLL_MS, E2E_READY_TIMEOUT_MS } from "@/constants/e2e";
import { AUTH_USERNAME } from "@/constants/server";
import { spawnTo, waitForMatch } from "./infra";

/**
 * The isolated opencode server the proof owns: its own process, its own port, and
 * **all four** XDG dirs under the temp root. Sessions live under `XDG_DATA_HOME`, so
 * redirecting state alone would still write the real database; the registered service
 * under `~/.local/state/opencode/` is never read, written or touched.
 *
 * The credential is the one the server generates and prints — read from the serve log
 * rather than invented, so the proof authenticates the way a real client does.
 */

export type IsolatedServer = {
	readonly pid: number;
	readonly url: string;
	readonly password: string;
};

/** The four redirected dirs. `XDG_CACHE_HOME` matters as much as the other three. */
export function xdgEnv(root: string): Record<string, string> {
	return {
		XDG_DATA_HOME: join(root, "data"),
		XDG_STATE_HOME: join(root, "state"),
		XDG_CONFIG_HOME: join(root, "config"),
		XDG_CACHE_HOME: join(root, "cache"),
	};
}

/** Spawn `opencode serve` isolated, and wait for the password it prints. */
export async function startIsolatedServer(root: string, port: number): Promise<IsolatedServer> {
	const log = join(root, "serve.log");
	const pid = spawnTo(
		["opencode", "serve", "--hostname", "127.0.0.1", "--port", String(port)],
		log,
		xdgEnv(root),
	);
	const password = await waitForMatch(
		log,
		E2E_PASSWORD_RE,
		"the isolated server's password",
		E2E_READY_TIMEOUT_MS,
	);
	return { pid, url: `http://127.0.0.1:${port}`, password };
}

/** The session directory inside the temp root: never a directory in this repo. */
export function sessionDirectory(root: string, name: string): string {
	const directory = join(root, name);
	mkdirSync(directory, { recursive: true });
	return directory;
}

/**
 * Seed exactly one root session through the app's own client seam — the pinned
 * `@opencode/client`, via the same `session.create` the app calls. No prompt is ever
 * sent, so no model runs: the proof's server has no credential anyway, and this is the
 * rule the earlier stray-agent proof earned.
 */
export async function seedSession(
	url: string,
	password: string,
	directory: string,
): Promise<string> {
	const auth = Buffer.from(`${AUTH_USERNAME}:${password}`).toString("base64");
	const client = OpenCode.make({ baseUrl: url, headers: { Authorization: `Basic ${auth}` } });
	const deadline = Date.now() + E2E_READY_TIMEOUT_MS;
	for (;;) {
		try {
			// The generated input wraps the payload in a codegen artifact; the flat
			// object is what the server accepts (docs/opencode-api.md §4).
			const created = await client.session.create({ location: { directory } } as never);
			return (created as { id: string }).id;
		} catch (error) {
			if (Date.now() > deadline) throw error;
			await Bun.sleep(E2E_POLL_MS);
		}
	}
}
