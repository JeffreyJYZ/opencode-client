import type { CSSProperties } from "react";
import { homeRoute, navigate, settingsRoute } from "@/app/router";
import { requestNewSession, requestSessionPicker } from "@/app/tabSync";
import { TabStrip } from "@/components/TabStrip";
import {
	APP_MARK_LABEL,
	APP_MARK_TITLE,
	NEW_SESSION_LABEL,
	NEW_SESSION_TITLE,
	PICKER_LABEL,
	PICKER_TITLE,
	SETTINGS_GEAR_LABEL,
	SETTINGS_GEAR_TITLE,
	TOPNAV_ID,
	TOPNAV_ORDER,
	TOPNAV_SLOT,
} from "@/constants/tabs";
import type { Disposable } from "@/plugins/disposable";
import { register } from "@/plugins/registry";

/**
 * The nav's built-in controls (spec 010 §Top nav, spec 040 §Modularity).
 *
 * Built-ins register through the same `register` a plugin uses — no second
 * path — so disabling one behaves exactly like disabling a plugin's. The gear
 * navigates to `/settings`, which the route sync opens as a tab; the `+` and
 * `⌕` buttons dispatch the events M1.3/M1.4 listen for.
 */

const BUTTON_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
	whiteSpace: "nowrap",
};

const MARK_STYLE: CSSProperties = {
	...BUTTON_STYLE,
	color: "var(--oc-text)",
	fontWeight: 600,
};

export function AppMark() {
	return (
		<button
			type="button"
			aria-label={APP_MARK_TITLE}
			title={APP_MARK_TITLE}
			style={MARK_STYLE}
			onClick={() => navigate(homeRoute())}
		>
			{APP_MARK_LABEL}
		</button>
	);
}

export function NewSessionButton() {
	return (
		<button
			type="button"
			title={NEW_SESSION_TITLE}
			style={BUTTON_STYLE}
			onClick={requestNewSession}
		>
			{NEW_SESSION_LABEL}
		</button>
	);
}

export function SessionPickerButton() {
	return (
		<button
			type="button"
			title={PICKER_TITLE}
			style={BUTTON_STYLE}
			onClick={requestSessionPicker}
		>
			{PICKER_LABEL}
		</button>
	);
}

export function SettingsGear() {
	return (
		<button
			type="button"
			title={SETTINGS_GEAR_TITLE}
			style={BUTTON_STYLE}
			onClick={() => navigate(settingsRoute())}
		>
			{SETTINGS_GEAR_LABEL}
		</button>
	);
}

let installed: Disposable[] | null = null;

/** Register the built-ins once; a second call is a no-op, never a duplicate. */
export function registerTopnavBuiltins(): void {
	if (installed !== null) return;
	installed = [
		register({ id: TOPNAV_ID.appMark, slot: TOPNAV_SLOT.appMark, component: AppMark }),
		// The strip is homed in topnav.center — the region that takes the
		// remaining width and flexes/scrolls (spec 010 §Top nav, M1.1b).
		register({ id: TOPNAV_ID.strip, slot: TOPNAV_SLOT.strip, component: TabStrip }),
		register({
			id: TOPNAV_ID.newSession,
			slot: TOPNAV_SLOT.newSession,
			component: NewSessionButton,
			order: TOPNAV_ORDER.newSession,
		}),
		register({
			id: TOPNAV_ID.picker,
			slot: TOPNAV_SLOT.picker,
			component: SessionPickerButton,
			order: TOPNAV_ORDER.picker,
		}),
		register({
			id: TOPNAV_ID.gear,
			slot: TOPNAV_SLOT.gear,
			component: SettingsGear,
			order: TOPNAV_ORDER.gear,
		}),
	];
}

/** Retract the built-ins. The tests' teardown; production never calls it. */
export function disposeTopnavBuiltins(): void {
	if (installed === null) return;
	for (const disposable of installed.splice(0)) disposable.dispose();
	installed = null;
}
