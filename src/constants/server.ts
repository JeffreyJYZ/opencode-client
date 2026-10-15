/**
 * The client link's constants (spec 010 §Window, spec 050 §Target and auth,
 * §Event ingest).
 *
 * Every value here is named because a second copy would be a second truth: the
 * auth username is the string the shipped client sends, the query key is what
 * the server writes into a pairing url, the timeout bounds a probe, and the four
 * stream values bound the liveness the event stream replaced the poll with.
 */

/** The HTTP basic-auth username the shipped client uses (spec 010 §Window). */
export const AUTH_USERNAME = "opencode";

/** The query parameter a browser credential can ride in. */
export const AUTH_TOKEN_QUERY = "auth_token";

/** The global the Tauri shell injects the target into (spec 010 §Window). */
export const TARGET_GLOBAL = "__OC_TARGET__";

/** The dev-build override's url variable (spec 050 §Target and auth). */
export const ENV_SERVER_URL = "VITE_OPENCODE_URL";

/** The dev-build override's password variable. */
export const ENV_PASSWORD = "VITE_OPENCODE_PASSWORD";

/** How long one liveness probe may take before it counts as a failure. */
export const CONNECTION_PROBE_TIMEOUT_MS = 10_000;

/**
 * How long a live stream may stay silent before the idle watchdog calls it dead.
 * A frame or a keepalive (`onActivity`) resets it; the iterator ending is the
 * faster detector, and this is the backstop for a connection that never ends.
 */
export const STREAM_IDLE_TIMEOUT_MS = 45_000;

/** The bounded reconnect's first delay and its ceiling. */
export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;

/** How many reconnects a dropped stream gets before it goes offline and waits for the retry action. */
export const RECONNECT_MAX_ATTEMPTS = 5;

/** The two reasons the stream reports, so the offline banner never shows a bare `Error`. */
export const STREAM_IDLE_REASON = "the event stream went quiet";
export const STREAM_ENDED_REASON = "the event stream ended";
