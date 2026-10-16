import { Button } from "@/components/Button";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { Section } from "@/components/Section";
import { PanelField, SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { Markdown } from "@/components/transcript/Markdown";

/**
 * The app's real kit (M4.21, spec 040 §The host `ui.kit`): the primitives a
 * plugin's UI builds from, each one the component the app itself renders —
 * never a parallel copy. `hostPorts.ts` passes this to `createHostFactory`,
 * so a host built there carries it; `src/plugins/kit.ts` keeps the type and
 * the empty default a kit-less host gets, and stays runtime-import-free.
 *
 * The names are the contract's; the app's own names differ in two places,
 * said here rather than hidden: `FieldRow` is the sidebar family's
 * `PanelField` (its one labelled-figure row), and `Menu` is `ContextMenu`
 * (the one focus-trapping positioned item list every surface shares).
 *
 * Not here, deliberately: `cls` and the class constants the spec's host table
 * used to name. No class-string system exists to expose — styling is inline
 * style objects over theme tokens, and the three `oc-*` rules in
 * `src/theme/base.css` are string literals, not named constants — so the
 * table names what is built instead of a joiner over nothing.
 */

/** The kit's six members, each the app's own component. */
export type AppKit = {
	readonly Button: typeof Button;
	readonly Panel: typeof SidebarPanel;
	readonly Section: typeof Section;
	readonly FieldRow: typeof PanelField;
	readonly Menu: typeof ContextMenu;
	readonly Markdown: typeof Markdown;
};

/** The kit a host built by the app carries: the six, frozen. */
export const APP_KIT: AppKit = Object.freeze({
	Button,
	Panel: SidebarPanel,
	Section,
	FieldRow: PanelField,
	Menu: ContextMenu,
	Markdown,
});
