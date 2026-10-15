import { describe, expect, test } from "bun:test";
import { BRANCH_RETRY_LIMIT } from "@/constants/vcs";
import type { OpenCodeClient } from "@/session/client";
import { readBranch } from "@/session/vcsBranch";

/**
 * The branch is a race M2.8 must not lose (spec 020 §Statusline). The read is
 * retried while `vcs.get()` answers `{"branch":{}}` — and **bounded**: a server
 * that never resolves a branch spends the retry and returns `null`, so no caller
 * is left waiting on a spinner that cannot end.
 */

/** A `vcs.get` that answers each of `answers` in turn, then repeats the last. */
function branchClient(answers: readonly (string | null)[]) {
	let calls = 0;
	const client = {
		vcs: {
			get: () => {
				const answer = answers[Math.min(calls, answers.length - 1)] ?? null;
				calls += 1;
				return Promise.resolve({
					location: { directory: "/tmp/proj" },
					data: { branch: { current: answer ?? undefined } },
				});
			},
		},
	} as unknown as OpenCodeClient;
	return { client, calls: () => calls };
}

const noSleep = () => Promise.resolve();

describe("the branch read", () => {
	test("retries while the server has not resolved the branch", async () => {
		const { client, calls } = branchClient([null, null, "main"]);
		expect(await readBranch(client, "/tmp/proj", { sleep: noSleep })).toBe("main");
		expect(calls()).toBe(3);
	});

	test("gives up at the named bound rather than spinning forever", async () => {
		const { client, calls } = branchClient([null]);
		expect(await readBranch(client, "/tmp/proj", { sleep: noSleep })).toBeNull();
		expect(calls()).toBe(BRANCH_RETRY_LIMIT);
	});

	test("a resolved branch costs exactly one read", async () => {
		const { client, calls } = branchClient(["main"]);
		expect(await readBranch(client, "/tmp/proj", { sleep: noSleep })).toBe("main");
		expect(calls()).toBe(1);
	});
});
