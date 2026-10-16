import {
	THEME_ATTRIBUTE,
	THEME_PROTECTED_VARIABLE_PREFIX,
	THEME_STYLE_ID,
	type Theme,
} from "@/constants/theme";

/**
 * The theme service's DOM edge (M3.4): the one `<style id="oc-theme">` element
 * and the one `data-theme` marker, split out of `theme/service.ts` so that file
 * stays the state machine under the length cap. Spec 030 §Theme service is what
 * makes it one module: the service is "the only writer of the theme variables",
 * and these are the only functions that write them.
 */

/** Split a theme's variables into the ones it may set and the ones it may not. */
export function sanitizeVariables(variables: Readonly<Record<string, string>>): {
	applied: Record<string, string>;
	dropped: string[];
} {
	const applied: Record<string, string> = {};
	const dropped: string[] = [];
	for (const [token, value] of Object.entries(variables)) {
		if (token.startsWith(THEME_PROTECTED_VARIABLE_PREFIX)) dropped.push(token);
		else applied[token] = value;
	}
	return { applied, dropped };
}

/** The one element: created on first use, found by id on every later apply. */
function styleElement(): HTMLStyleElement {
	const existing = document.getElementById(THEME_STYLE_ID);
	if (existing instanceof HTMLStyleElement) return existing;
	const element = document.createElement("style");
	element.id = THEME_STYLE_ID;
	document.head.append(element);
	return element;
}

function rootBlock(variables: Readonly<Record<string, string>>): string {
	const declarations = Object.entries(variables).map(([token, value]) => `\t${token}: ${value};`);
	return declarations.length === 0 ? "" : `:root {\n${declarations.join("\n")}\n}`;
}

/** Write a sanitized theme onto the document: the marker and the variables at once. */
export function writeThemeDom(applied: Readonly<Record<string, string>>, theme: Theme): void {
	if (typeof document === "undefined") return;
	const parts = [rootBlock(applied), theme.css ?? ""].filter((part) => part !== "");
	styleElement().textContent = parts.join("\n");
	document.documentElement.setAttribute(THEME_ATTRIBUTE, theme.mode);
}
