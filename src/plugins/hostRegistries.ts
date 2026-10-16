import { registerRoute } from "@/app/routeRegistry";
import { registerSettingsSection } from "@/app/settings/sections";
import { type CommandContribution, registerCommand, runCommand } from "@/plugins/commands";
import type { Disposable } from "@/plugins/disposable";
import type { PluginKit } from "@/plugins/kit";
import { type PanelContribution, registerPanel } from "@/plugins/panels";
import { type Actor, register as registerSlot } from "@/plugins/registry";
import { type RendererContribution, registerRenderer } from "@/plugins/renderers";
import type { Host } from "@/plugins/sdk";
import { activeTheme, applyTheme, clearTheme, registerTheme } from "@/theme/service";

/**
 * The host's **registry half** (M4.3, spec 040 §The host): every registry the host
 * exposes is the same function a built-in calls, and each contribution and
 * unsubscribe is handed to `track` so one LIFO disposal retracts them all.
 *
 * Held apart from `host.ts` so the factory reads as lifetime + wiring, and the
 * registries read as registration. The only thing that differs for a plugin is the
 * `Actor` it passes to the slot registry — which is what makes the two locked
 * areas a check.
 */

export type RegistryDeps = {
	readonly track: (disposable: Disposable) => Disposable;
	readonly actor: Actor;
	readonly kit: PluginKit;
};

/** The seven registries a host exposes, in one object. */
export type HostRegistries = Pick<
	Host,
	"ui" | "commands" | "panels" | "routes" | "settings" | "renderers" | "themes"
>;

export function createHostRegistries(deps: RegistryDeps): HostRegistries {
	const { track, actor } = deps;
	return {
		ui: {
			register: (contribution) => track(registerSlot(contribution, actor)),
			kit: deps.kit,
		},
		commands: {
			register: (contribution: CommandContribution) => track(registerCommand(contribution)),
			run: (id) => runCommand(id),
		},
		panels: {
			register: (contribution: PanelContribution) => track(registerPanel(contribution)),
		},
		routes: { register: (contribution) => track(registerRoute(contribution)) },
		settings: {
			registerSection: (section) =>
				track({
					dispose: registerSettingsSection({
						id: section.id,
						label: section.title,
						component: section.component,
						order: section.order,
					}),
				}),
		},
		renderers: {
			register: (contribution: RendererContribution) => track(registerRenderer(contribution)),
		},
		themes: {
			register: (theme) => track(registerTheme(theme)),
			apply: applyTheme,
			clear: clearTheme,
			active: activeTheme,
		},
	};
}
