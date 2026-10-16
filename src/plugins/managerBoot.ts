import { getSettings, subscribeSettings } from "@/app/settings/store";
import { subscribeToAppPorts } from "@/plugins/appPorts";
import { hydrateInstalled } from "@/plugins/installed";
import { loadEnabledPlugins, refresh } from "@/plugins/manager";

/**
 * The manager's boot (M4.10, spec 040 §Build, install, develop). Held apart from
 * `manager.ts` so the actions and the one loader read on their own and this is the
 * **one** place boot-time wiring lives.
 *
 * `startPluginManager` is called from `main.tsx` after the settings restore and
 * before the first render, which is the earliest correct point to **hydrate the
 * installed store**: the records are read once from `localStorage` (the manager's
 * action path only ever writes them), and doing it before the first paint means
 * the section's first snapshot already lists the installed plugins instead of
 * flashing empty until something else refreshes it.
 *
 * The **load** of enabled plugins does **not** happen here. At this point no
 * component has rendered, so the app has not yet published its ports
 * (`AppPorts.tsx`) and a host built now would be inert. Loading hangs off the two
 * things that can make a load meaningful and correct:
 * - the app publishing its ports (once, after the client bundle exists), and
 * - the master switch turning **on** (`settings.pluginsEnabled`, off by default),
 * which is the user's own act and should take effect at once.
 *
 * Both go through `loadEnabledPlugins`, whose guard is the loader's own `list()`,
 * so a plugin already running is never loaded twice. The switch is gated on the
 * false→true **transition** so an unrelated settings write (every tab, every
 * route) cannot re-attempt a plugin that already refused to load.
 */

let booted = false;
let wasEnabled = false;

export function startPluginManager(): void {
	hydrateInstalled();
	refresh();
	// Re-sync on every call: `resetSettings()` (or a second boot) does not fire the
	// settings listener, so the transition baseline must follow the live setting.
	wasEnabled = getSettings().pluginsEnabled;
	if (booted) return;
	booted = true;
	subscribeToAppPorts(loadEnabledPlugins);
	subscribeSettings(onSettingsChange);
}

function onSettingsChange(): void {
	const enabled = getSettings().pluginsEnabled;
	if (enabled && !wasEnabled) loadEnabledPlugins();
	wasEnabled = enabled;
}
