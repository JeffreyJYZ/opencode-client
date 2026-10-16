import type { Host } from "@/plugins/sdk";
import { GRUVBOX_THEME, THEME_ID } from "./palette";

/**
 * theme-gruvbox — a theme through the app's one theme service, with a settings
 * section to apply or clear it (spec 040 §Plugins shipped as examples). The
 * choice is remembered in the plugin's **own** storage, which is capped and
 * namespaced per plugin id (spec 040 §The host, `storage`).
 *
 * The palette, including the font claim the service refuses, is `./palette.ts`;
 * this file is the lifecycle and the section.
 */

declare const __ocReact: {
	readonly createElement: typeof import("react").createElement;
	readonly Fragment: typeof import("react").Fragment;
};

const SECTION_ID = "theme-gruvbox.section";
const SECTION_TITLE = "Gruvbox";
const STORAGE_KEY = "active";
const APPLY_LABEL = "Apply Gruvbox";
const CLEAR_LABEL = "Clear theme";
const STORED_NOTE =
	"Apply writes the theme through the one theme service and remembers the choice in this plugin's own storage. Its font claim is refused, so your typography stays.";
const NOTE_STYLE = { color: "var(--oc-text-muted)", margin: 0 };
const ROW_STYLE = { display: "flex", gap: "var(--oc-space-2)" };
const BUTTON_STYLE = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
};

function apply(host: Host): void {
	host.themes.apply(THEME_ID);
	void host.storage
		.set(STORAGE_KEY, THEME_ID)
		.catch((error: unknown) => host.log.warn(`could not remember the theme: ${String(error)}`));
}

function clear(host: Host): void {
	host.themes.clear();
	void host.storage
		.delete(STORAGE_KEY)
		.catch((error: unknown) => host.log.warn(`could not forget the theme: ${String(error)}`));
}

function GruvboxSection({ host }: { readonly host: Host }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--oc-space-2)" }}>
			<h2>{SECTION_TITLE}</h2>
			<p style={NOTE_STYLE}>{STORED_NOTE}</p>
			<div style={ROW_STYLE}>
				<button type="button" style={BUTTON_STYLE} onClick={() => apply(host)}>
					{APPLY_LABEL}
				</button>
				<button type="button" style={BUTTON_STYLE} onClick={() => clear(host)}>
					{CLEAR_LABEL}
				</button>
			</div>
		</div>
	);
}

export default {
	setup(host: Host) {
		host.themes.register(GRUVBOX_THEME);
		host.settings.registerSection({
			id: SECTION_ID,
			title: SECTION_TITLE,
			component: () => <GruvboxSection host={host} />,
		});
		void host.storage
			.get(STORAGE_KEY)
			.then((remembered) => {
				if (remembered === THEME_ID && !host.signal.aborted) host.themes.apply(THEME_ID);
			})
			.catch((error: unknown) => host.log.warn(`could not read the theme: ${String(error)}`));
	},
};
