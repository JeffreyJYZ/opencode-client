import { CONNECTION_STATUS } from "@/session/connectionState";
import { TARGET_SOURCE } from "@/session/target";

/**
 * The connect section's copy (spec 050 §Target and auth). Every string is named
 * so a surface holds no literal, and the two maps are keyed by the vocabularies
 * they describe — a new connection status or target source cannot silently fall
 * through to a blank line.
 */

export const CONNECT_TITLE = "Server";
export const CONNECT_URL_LABEL = "Server URL";
export const CONNECT_PASSWORD_LABEL = "Password";
export const CONNECT_BUTTON_TEXT = "Connect";
export const DISCONNECT_BUTTON_TEXT = "Disconnect";

/** Field ids, so a label is bound to its input and a test never guesses a string. */
export const CONNECT_FIELD_ID = {
	url: "connect-url",
	password: "connect-password",
} as const;

/** What the connection is doing, keyed by the connection state machine's status. */
export const CONNECT_STATE_TEXT = {
	[CONNECTION_STATUS.none]: "No server is configured.",
	[CONNECTION_STATUS.unknown]: "Contacting the server…",
	[CONNECTION_STATUS.online]: "Connected.",
	[CONNECTION_STATUS.offline]: "The server did not answer.",
} as const;

/** Where the live connection came from, keyed by the resolution-order source. */
export const CONNECT_SOURCE_TEXT = {
	[TARGET_SOURCE.injected]: "Provided by the app shell.",
	[TARGET_SOURCE.stored]: "Stored on this device.",
	[TARGET_SOURCE.dev]: "Provided by the dev environment.",
	[TARGET_SOURCE.origin]: "This page is served by it.",
} as const;
