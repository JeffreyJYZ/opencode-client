import type { OpenCodeClient } from "@opencode/client";
import { OpenCode } from "@opencode/client";
import { CONNECTION_PROBE_TIMEOUT_MS } from "@/constants/server";
import { authorizationHeader } from "@/session/credentials";
import type { ResolvedTarget } from "@/session/target";

/**
 * The app's single opencode client (spec 050 §Target and auth): one instance,
 * built from the resolved target, reused for every call and handed to plugins
 * as `host.opencode.client` (spec 040).
 *
 * The pinned client is the only seam to the server: never a raw route it
 * exposes (`docs/opencode-api.md` §3).
 */

export type { OpenCodeClient };

/** Build the one client. `baseUrl` plus the basic credential, nothing else. */
export function createClient(target: ResolvedTarget): OpenCodeClient {
	const authorization = authorizationHeader(target);
	return OpenCode.make({
		baseUrl: target.url,
		headers: authorization === undefined ? undefined : { Authorization: authorization },
	});
}

/**
 * One liveness probe: `server.info()` (`GET /api/info`, `docs/opencode-api.md`
 * §3), bounded so a black-holed host is a failure rather than a hang. It reports
 * by rejecting; the connection store is what turns that into a state.
 */
export async function probeConnection(
	client: OpenCodeClient,
	timeoutMs: number = CONNECTION_PROBE_TIMEOUT_MS,
): Promise<void> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		await client.server.info({ signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}
