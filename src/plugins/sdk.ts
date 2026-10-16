import type { OpenCodeClient } from "@opencode/client";
import type { ComponentType } from "react";
import type { Theme } from "@/constants/theme";
import type { Disposable } from "@/plugins/disposable";
import type { PluginKit } from "@/plugins/kit";
import type { PluginLogger } from "@/plugins/logs";
import type { PluginNative } from "@/plugins/services/native";
import type { PluginNotify } from "@/plugins/services/notify";
import type { PluginOpenCode } from "@/plugins/services/opencode";
import type { PluginStorage } from "@/plugins/services/storage";
import type { PluginTranscript } from "@/plugins/services/transcript";

/**
 * The host API's **types** (spec 040 §The host) — the one argument a plugin's
 * `setup` receives. A plugin's source imports this file for types only
 * (`import type { Host } from "@/plugins/sdk"`), which the build erases, so the
 * built entry still imports nothing.
 *
 * The runtime half is `src/plugins/host.ts`: one factory builds this object per
 * plugin, and every registry in it is the same function a built-in registers
 * through.
 */

/** `ui.register` (spec 040 §Slots). */
export type SlotRegistration = {
	readonly id: string;
	readonly slot: string;
	readonly component: ComponentType;
	readonly order?: number;
};

/** `commands.register` (spec 040 §The host). */
export type CommandRegistration = {
	readonly id: string;
	readonly title: string;
	readonly run: () => void;
	readonly keybinding?: string;
};

/** `panels.register` (spec 040 §The host). */
export type PanelRegistration = {
	readonly id: string;
	readonly title: string;
	readonly component: ComponentType;
	readonly order?: number;
};

/** `routes.register` (spec 040 §The host). */
export type RouteRegistration = {
	readonly id: string;
	readonly path: string;
	readonly component: ComponentType;
};

/** `settings.registerSection` (spec 040 §The host). `title` is the registry's `label`. */
export type SettingsRegistration = {
	readonly id: string;
	readonly title: string;
	readonly component: ComponentType;
	readonly order?: number;
};

/** `renderers.register` (spec 040 §The host). */
export type RendererRegistration = {
	readonly id: string;
	readonly kind: string;
	readonly component: ComponentType;
};

export type Host = {
	/** `{ app, api }` (spec 040 §The host). */
	readonly version: { readonly app: string; readonly api: string };
	/** Aborted when this plugin unloads. */
	readonly signal: AbortSignal;
	readonly ui: {
		register(contribution: SlotRegistration): Disposable;
		/** The app's primitives; the seam M4.7/M4.8 fill. */
		readonly kit: PluginKit;
	};
	readonly commands: {
		register(contribution: CommandRegistration): Disposable;
		run(id: string): boolean;
	};
	readonly panels: { register(contribution: PanelRegistration): Disposable };
	readonly routes: { register(contribution: RouteRegistration): Disposable };
	readonly settings: { registerSection(section: SettingsRegistration): Disposable };
	readonly renderers: { register(contribution: RendererRegistration): Disposable };
	readonly themes: {
		register(theme: Theme): Disposable;
		apply(id: string): boolean;
		clear(): boolean;
		active(): Theme | null;
	};
	readonly opencode: PluginOpenCode;
	readonly transcript: PluginTranscript;
	readonly storage: PluginStorage;
	/** `null` on a build with no filesystem adapter (spec 040: "`null` on web"). */
	readonly native: PluginNative | null;
	readonly notify: PluginNotify;
	readonly log: PluginLogger;
	/** The app events (spec 040 §The host, `on`); returns the unsubscribe. */
	on(event: string, handler: (payload: unknown) => void): () => void;
};

/** The client type a plugin sees through `host.opencode.client`. */
export type { OpenCodeClient };
