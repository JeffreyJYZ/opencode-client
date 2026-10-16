/**
 * The prompt box's and the docks' vocabulary (spec 020 §Prompt box, §Docks;
 * M2.5/M2.6). Every visible string, every DOM attribute and every keyboard
 * ordinal lives here, so no composer component holds a literal.
 *
 * The dock **decision words are the wire's own values** (`once`, `always`,
 * `reject` — `PermissionReply`, `docs/opencode-api.md` §4) rather than prose: the
 * label is what the server receives, so a translation could not drift from it.
 * The state values themselves are `DELIVERY`/`TOOL_STATUS` in
 * `constants/transcript.ts` — a second copy would be a second truth.
 */

/** The composer region's accessible name. */
export const COMPOSER_LABEL = "Prompt box";

/** The textarea's accessible name and its placeholder. */
export const COMPOSER_PROMPT_LABEL = "Prompt";
export const COMPOSER_PLACEHOLDER = "Ask anything — / for commands, @ for context";

/** The two affordances, and the third the queued rail names (spec 050 §Acceptance). */
export const COMPOSER_SEND_LABEL = "Send";
export const COMPOSER_INTERRUPT_LABEL = "Interrupt";

/** A prompt submitted while a turn runs is queued, never dropped (spec 020 §Prompt box). */
export const COMPOSER_QUEUED_LABEL = "Queued";
export const COMPOSER_QUEUED_NOTE = "Sends when the running turn finishes";

/** The named failures: never a console-only error (spec 010 §Desktop behaviours). */
export const COMPOSER_SEND_FAILED = "Prompt not sent";
export const COMPOSER_INTERRUPT_FAILED = "Interrupt failed";

/** Attachments (spec 020 §Prompt box): dropped or picked, carried as paths. */
export const COMPOSER_ATTACH_LABEL = "Attach files";
export const COMPOSER_ATTACH_REMOVE_LABEL = "Remove attachment";
export const COMPOSER_ATTACH_UNSUPPORTED = "No path on the dropped file, so it cannot be sent";
export const COMPOSER_ATTACH_TYPE = "text/uri-list";
export const COMPOSER_ATTACH_FALLBACK_TYPE = "text/plain";

/** The two triggers the menu answers to. */
export const COMPOSER_SLASH_PREFIX = "/";
export const COMPOSER_MENTION_PREFIX = "@";

/** The menu's listbox: its id, its name, and the option id its rows derive. */
export const COMPOSER_MENU_LIST_ID = "oc-composer-menu";
export const COMPOSER_MENU_LABEL = "Commands and context";
export const COMPOSER_MENU_OPTION_PREFIX = "oc-composer-option-";

/** The menu's two honest empty states — `command.list()` loads asynchronously. */
export const COMPOSER_MENU_LOADING = "Loading commands…";
export const COMPOSER_MENU_EMPTY = "Nothing matches";

/** What a menu row says about where it came from: a client command runs here. */
export const COMPOSER_SOURCE = {
	client: "Client",
	server: "Server",
} as const;

/** What a mention row names: `file.find`, `agent.list` and `skill.list`. */
export const COMPOSER_MENTION_KIND = {
	file: "File",
	agent: "Agent",
	skill: "Skill",
} as const;

/** The identity line (spec 020 §Prompt box): agent · model · thinking. */
export const COMPOSER_IDENTITY_SEPARATOR = " · ";
export const COMPOSER_AGENT_LABEL = "Agent";
export const COMPOSER_MODEL_LABEL = "Model";
export const COMPOSER_THINKING_LABEL = "Thinking";
export const COMPOSER_THINKING_ON = "on";
export const COMPOSER_THINKING_OFF = "off";

/** The footer line that names the keys a dock answers to. */
export const COMPOSER_DOCK_KEYS = {
	permission: "1 once · 2 always · 3 reject · esc reject",
	question: "enter answer · esc cancel",
} as const;

/** The docks' surfaces (spec 020 §Docks): their names and the ordinal accelerators. */
export const DOCK_LABEL = {
	permission: "Permission request",
	question: "Question",
} as const;

/** The three decisions, in wire spelling and with the ordinal that reaches each. */
export const DOCK_DECISION = ["once", "always", "reject"] as const;
export type DockDecision = (typeof DOCK_DECISION)[number];

/** Esc's decision in the permission dock: the wire's own `reject`, said out loud. */
export const DOCK_REFUSE: DockDecision = "reject";

/** The form dock's walk: `Field N of M`, and the answer controls. */
export const DOCK_FORM_SUBMIT_LABEL = "Submit";
export const DOCK_FORM_NEXT_LABEL = "Next";
export const DOCK_FORM_TOGGLE_LABEL = "Toggle option";
export const DOCK_FORM_EMPTY = "This form has no answerable field";
export const DOCK_FORM_PROGRESS_SEPARATOR = " of ";

/** The permission dock's subject line: the action, then one resource per line. */
export const DOCK_PERMISSION_ACTION_LABEL = "Action";
export const DOCK_PERMISSION_RESOURCES_LABEL = "Resources";

/** A dock reply's named failure. */
export const DOCK_REPLY_FAILED = "Reply not sent";
