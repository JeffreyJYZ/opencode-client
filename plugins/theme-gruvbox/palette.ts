import { THEME_MODE, type Theme } from "@/constants/theme";

/**
 * The gruvbox dark palette (spec 030 §Theme service, spec 040 §Plugins shipped as
 * examples), as named constants — a theme *is* the source of its colours, so the
 * values live here by name rather than inline in the section's component.
 *
 * `FONT_CLAIM` is deliberate: the theme service strips every `--oc-font*`
 * variable and records a `protected-variable` fault, so the user's typography
 * always wins over a theme's font claim (spec 030 §Theme service). Keeping the
 * claim here is what makes that precedence provable in both directions.
 */

const GRUVBOX = {
	bg: "#282828",
	bgRaised: "#3c3836",
	bgHigh: "#504945",
	fg: "#ebdbb2",
	fgMuted: "#a89984",
	accent: "#d79921",
	red: "#fb4934",
	orange: "#fe8019",
	yellow: "#fabd2f",
	border: "#504945",
} as const;

/** What the theme may not set: the service drops it and faults (spec 030). */
export const FONT_CLAIM = { "--oc-font-ui-family": "Gruvbox Sans" } as const;

export const THEME_ID = "gruvbox-dark";

export const GRUVBOX_THEME: Theme = {
	id: THEME_ID,
	name: "Gruvbox Dark",
	mode: THEME_MODE.dark,
	variables: {
		"--oc-surface": GRUVBOX.bg,
		"--oc-surface-raised": GRUVBOX.bgRaised,
		"--oc-surface-raised-high": GRUVBOX.bgHigh,
		"--oc-text": GRUVBOX.fg,
		"--oc-text-muted": GRUVBOX.fgMuted,
		"--oc-accent": GRUVBOX.accent,
		"--oc-danger": GRUVBOX.red,
		"--oc-warn": GRUVBOX.orange,
		"--oc-focus": GRUVBOX.yellow,
		"--oc-border": GRUVBOX.border,
		"--oc-radius": "6px",
		...FONT_CLAIM,
	},
};
