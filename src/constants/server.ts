/**
 * The client link's constants (spec 010 §Window, spec 050 §Target and auth).
 *
 * Every value here is named because a second copy would be a second truth: the
 * auth username is the string the shipped client sends, the query key is what
 * the server writes into a pairing url, and the two timeouts bound a probe and
 * a liveness poll.
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

/** How often a live connection re-checks the server. Offline never polls: the retry action does. */
export const CONNECTION_POLL_MS = 5_000;
