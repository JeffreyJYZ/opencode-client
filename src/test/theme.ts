import { THEME_ATTRIBUTE, THEME_MODE, THEME_STYLE_ID, type Theme } from "@/constants/theme";
import { FAULT_AREAS, listFaults, type PluginFault } from "@/plugins/faults";

/**
 * The theme tests' shared fixtures (M3.4). `PROOF_THEME` is a plugin-shaped theme
 * carrying one claim a theme may not make (`--oc-font-ui`), so the same object
 * proves the ordinary path and the protection rule.
 */

export const PROOF_THEME: Theme = {
	id: "m34-proof-theme",
	name: "M3.4 proof",
	mode: THEME_MODE.light,
	variables: { "--oc-surface": "#123456", "--oc-surface-raised": "#654321" },
	css: "body { outline: 1px solid magenta; }",
};

/** The root's marker — the one attribute that says which mode is in force. */
export function marker(): string | null {
	return document.documentElement.getAttribute(THEME_ATTRIBUTE);
}

/** The one style element's text, or `""` when nothing has been applied. */
export function styles(): string {
	return document.getElementById(THEME_STYLE_ID)?.textContent ?? "";
}

/** How many `<style>` elements the document holds — the service owns one. */
export function styleCount(): number {
	return document.querySelectorAll("style").length;
}

/** Every fault the theme service recorded, oldest first. */
export function themeFaults(): readonly PluginFault[] {
	return listFaults().filter((fault) => fault.area === FAULT_AREAS.themes);
}
