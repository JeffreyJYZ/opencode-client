import { getSettings } from "@/app/settings/store";
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
 * The stored target from the connect flow (spec 050's second source): the
 * `settings.server` cell of the persisted blob, read through the settings store
 * so there is one truth for it. `null` (nothing stored) is absent; a blank
 * password is no password, so the client sends no `Authorization` header.
 */
export function readStoredTarget(): TargetCandidate | undefined {
	const server = getSettings().server;
	if (server === null) return undefined;
	return { url: server.url, password: server.password === "" ? undefined : server.password };
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

/**
 * Pick the first present source in spec 050's order. Re-runnable: the
 * `auth_token` is consumed once at startup (`readAndStripAuthToken`) and its
 * password is passed back in, so a re-resolution after a connect reads the
 * stored target the form just wrote without touching the address bar again.
 */
export function resolveTargets(authTokenPassword: string | undefined): ResolvedTarget | null {
	return resolveTarget({
		injected: readInjectedTarget(),
		stored: readStoredTarget(),
		dev: readDevTarget(),
		origin: readOriginTarget(),
		authTokenPassword,
	});
}

/** Resolve once, at startup: consume the token, then pick the first present source. */
export function resolveStartupTarget(): ResolvedTarget | null {
	return resolveTargets(readAndStripAuthToken());
}
