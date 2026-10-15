/**
 * The markdown renderer's constants (M2.3; spec 030 §Two font roles names the
 * code face a token, never a family).
 *
 * Both caps are named here so the renderer holds no literal: a fence whose
 * language is not in `HIGHLIGHT_LANGUAGES`, or whose code is longer than
 * `HIGHLIGHT_MAX_CHARS`, is rendered as plain text instead of being highlighted.
 */

/** The attribute a rendered block carries: its position in the document. */
export const MARKDOWN_BLOCK_ATTR = "data-block";

/**
 * The languages a fence may be highlighted in — **the cap**.
 *
 * Measured from the loaded grammars (`getLoadedLanguages()`), ids and aliases
 * both: a fence whose info string is anything else is not handed to the engine
 * at all, so an unknown or absurd `lang` falls back to plain code rather than
 * throwing inside a `marked` render.
 */
export const HIGHLIGHT_LANGUAGES = [
	"bash",
	"c",
	"c++",
	"cjs",
	"cpp",
	"cpp-macro",
	"css",
	"cts",
	"diff",
	"glsl",
	"go",
	"gql",
	"graphql",
	"haml",
	"html",
	"java",
	"javascript",
	"js",
	"json",
	"jsx",
	"lua",
	"markdown",
	"md",
	"mjs",
	"mts",
	"py",
	"python",
	"rb",
	"regex",
	"regexp",
	"rs",
	"ruby",
	"rust",
	"sh",
	"shell",
	"shellscript",
	"sql",
	"toml",
	"ts",
	"tsx",
	"typescript",
	"xml",
	"yaml",
	"yml",
	"zsh",
] as const;

/** A fence longer than this renders as plain text — the absurd-input cap. */
export const HIGHLIGHT_MAX_CHARS = 20_000;

/** How long a fence must stop changing before it is highlighted once (the debounce). */
export const HIGHLIGHT_DEBOUNCE_MS = 120;

/** The two TextMate themes the code surface resolves against, per `data-theme`. */
export const HIGHLIGHT_THEMES = { light: "github-light", dark: "github-dark" } as const;

/**
 * The window event a markdown link dispatches so the host can open it in the OS
 * browser (M5.2 wires the handler; the webview never navigates). Same signal
 * shape as the nav's `oc:new-session` (spec 010 §Top nav).
 */
export const OPEN_EXTERNAL_EVENT = "oc:open-external";

/** The schemes that count as "outside the app". */
export const EXTERNAL_SCHEMES = ["http:", "https:", "mailto:"] as const;
