/**
 * The `notify` service (spec 040 §The host): host-rendered notices. The rendering
 * is a port (`PluginNotifier`), because the toast/banner/modal chrome is the app's
 * (M4.20); the contract is here.
 *
 * With no notifier installed, `toast`/`banner`/`modal` are no-ops and `confirm`
 * resolves `false` — it never hangs and never throws into the plugin, so a plugin
 * cannot stall on a dialog nobody drew.
 */

export const PLUGIN_NOTICE_KIND = {
	toast: "toast",
	banner: "banner",
	modal: "modal",
} as const;

export type PluginNoticeKind = (typeof PLUGIN_NOTICE_KIND)[keyof typeof PLUGIN_NOTICE_KIND];

export type PluginNotice = {
	readonly kind: PluginNoticeKind;
	readonly message: string;
};

export type PluginNotifier = {
	show(notice: PluginNotice): void;
	confirm(message: string): Promise<boolean>;
};

/** The notifier a host gets when the app supplies none: nothing, said plainly. */
export const NO_NOTIFIER: PluginNotifier = {
	show: () => {},
	confirm: async () => false,
};

export type PluginNotify = {
	toast(message: string): void;
	banner(message: string): void;
	modal(message: string): void;
	confirm(message: string): Promise<boolean>;
};

export function createPluginNotify(notifier: PluginNotifier = NO_NOTIFIER): PluginNotify {
	const show = (kind: PluginNoticeKind) => (message: string) => {
		notifier.show({ kind, message });
	};
	return {
		toast: show(PLUGIN_NOTICE_KIND.toast),
		banner: show(PLUGIN_NOTICE_KIND.banner),
		modal: show(PLUGIN_NOTICE_KIND.modal),
		confirm: (message) => notifier.confirm(message),
	};
}
