import { APP_EVENT } from "@/constants/plugins";
import { DEFAULT_THEME_ID, THEME_ATTRIBUTE, THEME_STYLE_ID, type Theme } from "@/constants/theme";
import { emitAppEvent } from "@/plugins/appEvents";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { sanitizeVariables, writeThemeDom } from "@/theme/dom";
import { followSystem, stopFollowingSystem } from "@/theme/followSystem";
import {
	getTheme,
	insertTheme,
	removeTheme,
	resetThemeRegistry,
	themeProblem,
} from "@/theme/registry";

/**
 * The theme service (spec 030 §Theme service, spec 040 §The host): the **only
 * writer** of the theme variables, and the only thing that touches
 * `data-theme`. One `<style id="oc-theme">` element is created on the first
 * apply and reused forever after — an apply rewrites its text, so a switch
 * leaves nothing of the previous theme behind, and a clear returns to the
 * built-in default the same way. The DOM edge itself (`sanitizeVariables`,
 * `writeThemeDom`) lives in `theme/dom.ts`, so this file stays the state machine.
 *
 * A theme that cannot be applied is inert plus a fault, never a broken window: an
 * unknown id leaves the current theme on screen untouched, and a malformed
 * registration is refused with the same `REFUSED` handle a slot gets. The font
 * variables are stripped before they reach the DOM — the user's typography wins,
 * so no theme can make the UI unreadable.
 *
 * M3.6 adds the follow-system mode. The service owns **when** the system's
 * appearance is watched — only while that preference is in force — and
 * `theme/followSystem.ts` owns the media edge; an explicit theme stops the watch.
 *
 * A theme that goes into force is also the `theme-changed` emitter (M4.14), from
 * `putInForce` — the one place a theme becomes active, reached by a pick, a clear
 * and the follow-system flip alike.
 */

export { getTheme, listThemes, subscribeToThemes } from "@/theme/registry";

let active: Theme | null = null;
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of [...listeners]) listener();
}

function fault(reason: FaultReason, subject: string, message: string): void {
	recordFault({ area: FAULT_AREAS.themes, reason, subject, message });
}

/** The theme now in force, or `null` before the first apply. */
export function activeTheme(): Theme | null {
	return active;
}

export function subscribeToActiveTheme(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Put a theme in force. Idempotent, and it survives a switch: the element's text
 * is replaced wholesale. An id nobody registered changes nothing on screen and
 * is recorded, because a silent no-op is how a typo becomes a mystery.
 */
function putInForce(id: string): boolean {
	const theme = getTheme(id);
	if (theme === null) {
		fault(FAULT_REASONS.invalidTheme, id, `no theme is registered under "${id}"`);
		return false;
	}
	const { applied, dropped } = sanitizeVariables(theme.variables);
	for (const token of dropped) {
		fault(
			FAULT_REASONS.protectedVariable,
			theme.id,
			`the theme "${theme.id}" tried to set ${token}; the user's typography wins`,
		);
	}
	writeThemeDom(applied, theme);
	active = theme;
	notify();
	emitAppEvent(APP_EVENT.themeChanged, { id: theme.id });
	return true;
}

/**
 * Put a named theme in force (M3.4). An explicit choice — a pick, a clear, a
 * plugin's `themes.apply` — **wins over the system**: it stops the follow-system
 * watch, so no later OS flip can move the app (M3.6).
 */
export function applyTheme(id: string): boolean {
	stopFollowingSystem();
	return putInForce(id);
}

/**
 * Follow the system's appearance (M3.6): put the mode `prefers-color-scheme`
 * asks for in force, and keep it in force through `theme/followSystem.ts`.
 */
export function applyFollowSystem(): boolean {
	return followSystem(putInForce);
}

/** Back to the built-in default, without leaving the previous theme's variables. */
export function clearTheme(): boolean {
	return applyTheme(DEFAULT_THEME_ID);
}

/** Register a theme; the handle removes it and clears it if it was in force. */
export function registerTheme(theme: Theme): Disposable {
	const problem = themeProblem(theme);
	if (problem !== null) {
		const subject = typeof theme?.id === "string" ? theme.id : "?";
		fault(FAULT_REASONS.invalidTheme, subject, `the theme "${subject}" has ${problem}`);
		return REFUSED;
	}
	insertTheme(theme);
	return {
		dispose(): void {
			removeTheme(theme.id);
			if (active?.id === theme.id) clearTheme();
		},
	};
}

/** The tests' reset: no active theme, no element, no marker, built-ins only. */
export function resetThemeService(): void {
	stopFollowingSystem();
	active = null;
	resetThemeRegistry();
	if (typeof document === "undefined") return;
	document.getElementById(THEME_STYLE_ID)?.remove();
	document.documentElement.removeAttribute(THEME_ATTRIBUTE);
}
