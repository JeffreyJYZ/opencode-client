#!/usr/bin/env bun
/**
 * Release verification (M5.4). `bun scripts/verify-release.ts <tag>`
 *
 * Prints **one** verdict line and exits non-zero on any gap. It is committed
 * rather than kept in a shell history because the check belongs to the project:
 * a release is verified by running this, and a gap is a red exit code, not a
 * sentence in a report.
 *
 * The four gaps it refuses to pass:
 *
 *   1. no tag of that name exists;
 *   2. the tag names a version the built app does not claim;
 *   3. the artifact the tag is meant to ship was never built;
 *   4. the artifact was built **before** the tag was cut, so it cannot be the
 *      build that tag names.
 *
 * Only the two that can become true asynchronously are polled — a tag CI pushes
 * moments later, an artifact still being copied into place. A version mismatch
 * and a stale artifact cannot fix themselves, so those answer at once.
 */
import { existsSync, readFileSync, statSync } from "node:fs";

/** The prefix a release tag carries: `v0.1.0` for version `0.1.0`. */
const TAG_PREFIX = "v";
/** The one file that holds the version — `src-tauri/src/version.rs` says why. */
const PACKAGE_JSON = "package.json";
/** The bundle `bun tauri build` produces for this app on macOS. */
const ARTIFACT_PATH = "src-tauri/target/release/bundle/macos/opencode client.app";
/** How many times a not-yet-true condition is re-read, and how long apart. */
const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 5_000;

/** Run a command, returning trimmed stdout or `null` when it failed. */
function run(command: string[]): string | null {
	const result = Bun.spawnSync(command, { stdout: "pipe", stderr: "ignore" });
	if (result.exitCode !== 0) return null;
	const text = result.stdout.toString().trim();
	return text === "" ? null : text;
}

/** The commit a tag points at, or `null` when there is no such tag. */
function tagCommit(tag: string): string | null {
	return run(["git", "rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`]);
}

/** Read until it answers or the attempts run out. */
async function poll<T>(read: () => T | null): Promise<T | null> {
	for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
		const value = read();
		if (value !== null) return value;
		if (attempt + 1 < POLL_ATTEMPTS) await Bun.sleep(POLL_INTERVAL_MS);
	}
	return null;
}

/** A millisecond timestamp as a second-resolution UTC instant. */
const instant = (ms: number): string => `${new Date(ms).toISOString().slice(0, 19)}Z`;

/** Print the verdict — one line — and exit. */
function verdict(tag: string, gap: string | null, detail: string): never {
	const line =
		gap === null
			? `verify-release ${tag}: ok — ${detail}`
			: `verify-release ${tag}: FAIL — ${gap}`;
	console.log(line);
	process.exit(gap === null ? 0 : 1);
}

const tag = process.argv[2];
if (tag === undefined || tag.trim() === "") {
	verdict("<tag>", "no tag given; usage: bun scripts/verify-release.ts <tag>", "");
}

// 1. The tag, polled: CI may cut it moments before this runs.
if ((await poll(() => tagCommit(tag))) === null) {
	verdict(tag, `no tag ${tag} in this repository`, "");
}

// 2. The tag names the version the app was built as, not another release's.
const version = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).version as string;
if (tag !== `${TAG_PREFIX}${version}`) {
	verdict(tag, `names ${tag.replace(/^v/, "")} but the built version is ${version}`, "");
}

// 3. The artifact exists, polled: a build may still be copying it into place.
if ((await poll(() => (existsSync(ARTIFACT_PATH) ? ARTIFACT_PATH : null))) === null) {
	verdict(tag, `no artifact at ${ARTIFACT_PATH}; run \`bun tauri build\``, "");
}

// 4. The artifact was built at or after the tag, so it is the build that tag
//    names. Before it, the tag points at something this artifact predates.
const cut = run(["git", "log", "-1", "--format=%ct", tag]);
if (cut === null) {
	verdict(tag, `cannot read the commit timestamp of ${tag}`, "");
}
const cutAt = Number(cut) * 1000;
const builtAt = statSync(ARTIFACT_PATH).mtimeMs;
if (builtAt < cutAt) {
	verdict(tag, `the artifact is stale: built ${instant(builtAt)}, tag cut ${instant(cutAt)}`, "");
}

verdict(tag, null, `version ${version}, artifact built ${instant(builtAt)}`);
