import { BRANCH_RETRY_DELAY_MS, BRANCH_RETRY_LIMIT } from "@/constants/vcs";
import type { OpenCodeClient } from "@/session/client";

/**
 * The branch read (spec 020 §Statusline, spec 050 §Sessions): `vcs.get()`
 * answers `{"branch":{}}` immediately after a location is activated and the real
 * branch about half a second later (`docs/opencode-api.md` §4), so a read that
 * gives up on the first empty answer would never show a branch. It is retried
 * while empty — **bounded** by a named limit, so it can neither spin forever nor
 * leave an endless spinner.
 *
 * The location is passed explicitly; nothing here calls `vcs.init` (a write that
 * would create a repository in a non-repo directory).
 */

export type BranchReadOptions = {
	/** Override the retry bound (a test's); production uses `BRANCH_RETRY_LIMIT`. */
	readonly attempts?: number;
	readonly delayMs?: number;
	/** Override the wait (a test's fake clock); production sleeps for real. */
	readonly sleep?: (ms: number) => Promise<void>;
};

/** The branch, or `null` when the server has not resolved one yet. */
export async function readBranchOnce(
	client: OpenCodeClient,
	directory: string,
): Promise<string | null> {
	const result = await client.vcs.get({ location: { directory } });
	const branch = result?.data?.branch?.current;
	return typeof branch === "string" && branch !== "" ? branch : null;
}

/**
 * Read the branch, retrying while it is unresolved. Returns `null` when the
 * bound is spent — the caller renders "no branch", never a spinner.
 */
export async function readBranch(
	client: OpenCodeClient,
	directory: string,
	options: BranchReadOptions = {},
): Promise<string | null> {
	const attempts = options.attempts ?? BRANCH_RETRY_LIMIT;
	const delayMs = options.delayMs ?? BRANCH_RETRY_DELAY_MS;
	const sleep = options.sleep ?? ((ms: number) => new Promise((done) => setTimeout(done, ms)));
	for (let attempt = 0; attempt < attempts; attempt++) {
		const branch = await readBranchOnce(client, directory);
		if (branch !== null) return branch;
		if (attempt < attempts - 1) await sleep(delayMs);
	}
	return null;
}
