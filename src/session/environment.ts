import { ENV_PASSWORD, ENV_SERVER_URL, TARGET_GLOBAL } from "@/constants/server";
import { consumeAuthToken } from "@/session/credentials";
import {
	originCandidate,
	type ResolvedTarget,
	resolveTarget,
	type TargetCandidate,
} from "@/session/target";

/**
 * The browser edge of target resolution (spec 050 §Target and auth): read the
 * four candidate sources, consume and strip `?auth_token=`, and pick the winner.
 *
 * This is the only module that touches `window`, the injected global and Vite's
 * environment; every decision it feeds lives in `target.ts`, pure and tested.
 */

/** The injected global's shape. Anything else is "the shell injected nothing" (spec 010 §Window). */
type InjectedGlobal = { readonly url?: unknown; readonly password?: unknown };

/** Vite's environment, or `{}` where there is none (a `bun test` run). */
function viteEnv(): Record<string, unknown> {
	// The `import.meta.env` member expression is written directly, not behind a
	// type cast: Vite's define matches the expression itself, so a cast makes the
	// dev override (VITE_OPENCODE_URL) silently absent instead of applied.
	const env: unknown = import.meta.env;
	return typeof env === "object" && env !== null ? (env as Record<string, unknown>) : {};
}

/** `window.__OC_TARGET__` when the shell injected one, else `undefined`. */
export function readInjectedTarget(): TargetCandidate | undefined {
	const injected = (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	if (typeof injected !== "object" || injected === null) return undefined;
	const { url, password } = injected as InjectedGlobal;
	if (typeof url !== "string") return undefined;
	return { url, password: typeof password === "string" ? password : undefined };
}

/** The Vite dev override (spec 050), when both the build and the environment set nothing else. */
export function readDevTarget(): TargetCandidate | undefined {
	const env = viteEnv();
	const url = env[ENV_SERVER_URL];
	if (typeof url !== "string" || url.trim() === "") return undefined;
	const password = env[ENV_PASSWORD];
	return {
		url,
		password: typeof password === "string" && password !== "" ? password : undefined,
	};
}

/**
 * The stored target from the connect flow — **the named seam, not a key**.
 *
 * Spec 010 §Persistence lists the settings blob's keys and none of them holds a
 * server target, so this resolves as "absent" until M1.5 defines the key; a
 * guessed key here would be a second truth for the connect flow to contradict.
 */
export function readStoredTarget(): TargetCandidate | undefined {
	return undefined;
}

/** The page's own origin, when a server serves this bundle (spec 050). */
export function readOriginTarget(): TargetCandidate | undefined {
	const production = viteEnv().PROD === true;
	return originCandidate(production, window.location.origin);
}

/**
 * Read `?auth_token=` and strip it from the address bar before anything else
 * runs, so the credential is not left visible or in history (spec 050).
 */
export function readAndStripAuthToken(): string | undefined {
	const { password, search } = consumeAuthToken(window.location.search);
	if (search !== window.location.search) {
		const url = new URL(window.location.href);
		url.search = search;
		window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
	}
	return password;
}

/** Resolve once, at startup: consume the token, then pick the first present source. */
export function resolveStartupTarget(): ResolvedTarget | null {
	const authTokenPassword = readAndStripAuthToken();
	return resolveTarget({
		injected: readInjectedTarget(),
		stored: readStoredTarget(),
		dev: readDevTarget(),
		origin: readOriginTarget(),
		authTokenPassword,
	});
}
