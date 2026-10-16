/**
 * The scripted browser proof's vocabulary (`scripts/e2e.ts` and `scripts/e2e/`),
 * M0.1. Every literal the proof needs lives here for the same reason app constants
 * do — a second copy would be a second truth, and a reader of the proof should not
 * have to guess which port band or which browser session it owns.
 */

/** The port band the controller allotted this proof; it must not stray outside it. */
export const E2E_PORT_FIRST = 5390;
export const E2E_PORT_LAST = 5400;

/**
 * The proof's own `agent-browser` session. It is private: the proof closes **this**
 * session and never `--all`, which would close other agents' sessions.
 */
export const E2E_BROWSER_SESSION = "m01";

/** How long a spawned server or app has to become ready before the proof gives up. */
export const E2E_READY_TIMEOUT_MS = 30_000;

/** Poll cadence while waiting for readiness or for a process to exit. */
export const E2E_POLL_MS = 100;

/** The isolated serve log's password line, which is where the credential comes from. */
export const E2E_PASSWORD_RE = /^server password (\S+)$/m;

/**
 * The throwaway directory the seeded session lives in, inside the temp root. Its last
 * path segment is what the home page prints on that session's row, so it is the
 * proof's evidence that home really fetched from the injected target.
 */
export const E2E_SESSION_DIR = "e2e-session-dir";

/**
 * Point the proof's **injected** target at another url instead of its own isolated
 * server. This is the seam that proves the gate: a dead url must fail the run, so a
 * green run cannot be a run that asserted nothing.
 */
export const E2E_TARGET_URL_ENV = "E2E_TARGET_URL";

/** What a green run does prove — printed with the verdict, so the line is honest. */
export const E2E_COVERS =
	"the shell boots, uses the injected target, renders home with a session fetched over that target, shows a session's transcript region, and has a composer with a send affordance; no page errors";

/** What a green run does **not** prove — named so nobody reads the pass as more. */
export const E2E_NOT_COVERS =
	"any model turn or streaming, the docks, keyboard chords, the Tauri shell/webview, themes, plugins, or a packaged build";
