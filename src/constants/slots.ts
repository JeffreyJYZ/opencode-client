import type { SlotName } from "@/plugins/slots";

/**
 * The slot ids, by the place that hosts them (M4.12). Every **non-locked** id in
 * `slots.ts` appears here, so the map is the host registry `SlotHosts.test.tsx`
 * reads: a slot added to the tuple with no host fails there, which is what stops
 * the in-app reference advertising a slot that renders nowhere.
 *
 * The locked two (`app.substrate`, `app.builtins`) are deliberately absent — M4.17
 * mounts the substrate through the same `register`, and the reference keeps both
 * flagged `locked`.
 *
 * A value is a `SlotName`, so a typo is a compile error, and `Object.values` is the
 * set the coverage test compares against the tuple.
 */
export const SLOT = {
	topnavLeft: "topnav.left",
	topnavCenter: "topnav.center",
	topnavRight: "topnav.right",
	homeHero: "home.hero",
	homeWidgets: "home.widgets",
	homeActions: "home.actions",
	sessionToolbar: "session.toolbar",
	sessionSidebarPanels: "session.sidebar.panels",
	transcriptRowActions: "transcript.row.actions",
	transcriptFooter: "transcript.footer",
	composerToolbar: "composer.toolbar",
	composerAbove: "composer.above",
	composerBelow: "composer.below",
	statuslineLeft: "statusline.left",
	statuslineRight: "statusline.right",
	settingsSections: "settings.sections",
	overlays: "overlays",
} as const satisfies Record<string, SlotName>;

/**
 * The locked areas themselves (spec 040 §Model), by name (M4.17): the shell's
 * place and the built-ins' grouping. Deliberately **outside** `SLOT` — that map
 * is the host list the coverage test checks, and these two have no `<Slot>`
 * mount there; `app.substrate` is hosted once at the root (`main.tsx`) and
 * `app.builtins` is hosted nowhere, because its members render where they
 * already do.
 */
export const SLOT_LOCKED = {
	substrate: "app.substrate",
	builtins: "app.builtins",
} as const satisfies Record<string, SlotName>;
