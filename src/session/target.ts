/**
 * Target resolution (spec 050 §Target and auth), pure over its four candidate
 * sources.
 *
 * The shell learned the lesson the hard way (`src-tauri/src/target/service.rs`):
 * everything that decides is a pure function, so the resolution order is
 * unit-tested without a browser. The credential lives next door in
 * `credentials.ts`; the environment reads in `environment.ts`.
 */

/** Which candidate won. The banner needs the url; a misconfiguration report wants this too. */
export const TARGET_SOURCE = {
	injected: "injected",
	stored: "stored",
	dev: "dev",
	origin: "origin",
} as const;

export type TargetSource = (typeof TARGET_SOURCE)[keyof typeof TARGET_SOURCE];

/** One candidate: a url and, when that source carries one, a password. */
export type TargetCandidate = {
	readonly url: string;
	readonly password?: string;
};

/** The resolved target, and where it came from. */
export type ResolvedTarget = {
	readonly url: string;
	readonly password: string | undefined;
	readonly source: TargetSource;
};

/** The four sources in spec 050's order; `undefined` is "this source is absent". */
export type TargetCandidates = {
	readonly injected: TargetCandidate | undefined;
	readonly stored: TargetCandidate | undefined;
	readonly dev: TargetCandidate | undefined;
	readonly origin: TargetCandidate | undefined;
	/** The password from `?auth_token=`, already consumed; it fills a source that carries none. */
	readonly authTokenPassword: string | undefined;
};

/**
 * The winning source, first match wins: injected global, stored target, dev
 * override, else the page's own origin. A blank url is not a target, and no
 * source at all is `null` — the documented normal "the shell injected nothing"
 * state (spec 010 §Window), not an error.
 */
export function resolveTarget(candidates: TargetCandidates): ResolvedTarget | null {
	const ordered: ReadonlyArray<readonly [TargetSource, TargetCandidate | undefined]> = [
		[TARGET_SOURCE.injected, candidates.injected],
		[TARGET_SOURCE.stored, candidates.stored],
		[TARGET_SOURCE.dev, candidates.dev],
		[TARGET_SOURCE.origin, candidates.origin],
	];
	for (const [source, candidate] of ordered) {
		if (candidate === undefined) continue;
		const url = candidate.url.trim();
		if (url === "") continue;
		return { url, password: candidate.password ?? candidates.authTokenPassword, source };
	}
	return null;
}

/**
 * The page's own origin as a candidate: only when a server serves the built
 * bundle (spec 050's "web build served by a server"). A dev server serves the
 * app from its own origin, not the API's, so guessing there would be wrong.
 */
export function originCandidate(production: boolean, origin: string): TargetCandidate | undefined {
	if (!production) return undefined;
	return origin === "" || origin === "null" ? undefined : { url: origin };
}
