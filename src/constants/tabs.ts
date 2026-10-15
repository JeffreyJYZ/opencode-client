/**
 * The top nav and tab strip's constants (spec 010 §Top nav, §Desktop behaviours).
 *
 * A tab is a *view*: a session, or the settings view while it is open. Titles
 * come from the server where one exists (M1.2 owns the session list); until
 * then the strip shows the id, truncated by CSS.
 */

/** What a tab holds. Mirrors the router's kinds without importing it. */
export const TAB_KIND = {
	session: "session",
	settings: "settings",
} as const;

export type TabKind = (typeof TAB_KIND)[keyof typeof TAB_KIND];

/** The label the settings tab carries. */
export const SETTINGS_TAB_LABEL = "Settings";

/** The app mark's accessible name; clicking it lands on home. */
export const APP_MARK_LABEL = "opencode";
export const APP_MARK_TITLE = "Home";

/** The right-hand controls' labels. */
export const NEW_SESSION_LABEL = "+ New session";
export const NEW_SESSION_TITLE = "New session";
export const PICKER_LABEL = "⌕";
export const PICKER_TITLE = "Find session";
export const SETTINGS_GEAR_LABEL = "⚙";
export const SETTINGS_GEAR_TITLE = "Settings";
export const OVERFLOW_LABEL = "⋯";
export const OVERFLOW_TITLE = "All tabs";
export const TAB_CLOSE_LABEL = "×";

/** The pip on a tab that produced output while unfocused. */
export const UNREAD_MARK = "●";

/** The status dot's hover text: the running set the event stream feeds (M2.1). */
export const TAB_RUNNING_TITLE = "running";
export const TAB_IDLE_TITLE = "idle";
export const TAB_UNREAD_LABEL = "unread";

/**
 * The window events the `+` button, the picker button and ⌘T dispatch. M1.3
 * listens for the first, M1.4 for the second; until then they are affordances
 * with a named signal, not faked sessions. The palette's signal (M1.6) joins
 * them: whichever overlay opens closes the other, so two never share `Escape`.
 */
export const NEW_SESSION_EVENT = "oc:new-session";
export const SESSION_PICKER_EVENT = "oc:session-picker";
export const COMMAND_PALETTE_EVENT = "oc:command-palette";

/**
 * The slot each built-in nav control registers into — through `register`.
 * The tab strip's single home is `topnav.center` (spec 010 §Top nav: it takes
 * the remaining width and flexes/scrolls; a contribution in `left` cannot
 * disturb it). Tightened: a typo'd key is now a compile error.
 */
export const TOPNAV_SLOT = {
	appMark: "topnav.left",
	strip: "topnav.center",
	newSession: "topnav.right",
	picker: "topnav.right",
	gear: "topnav.right",
} as const;

/** The three regions the nav row renders, each a slot host. */
export const TOPNAV_REGION = {
	left: "topnav.left",
	center: "topnav.center",
	right: "topnav.right",
} as const;

/** The ids the built-ins register under; a plugin reusing one is refused. */
export const TOPNAV_ID = {
	appMark: "topnav.app-mark",
	strip: "topnav.strip",
	newSession: "topnav.new-session",
	picker: "topnav.session-picker",
	gear: "topnav.settings-gear",
} as const;

/** Lower sorts first; the strip keeps registration order among plugins. */
export const TOPNAV_ORDER = {
	newSession: -3,
	picker: -2,
	gear: -1,
} as const;
