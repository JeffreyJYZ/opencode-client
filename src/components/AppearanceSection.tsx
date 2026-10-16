import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { updateSettings } from "@/app/settings/store";
import { useSettings } from "@/app/settings/useSettings";
import {
	APPEARANCE_FOLLOW_SYSTEM_LABEL,
	APPEARANCE_IN_FORCE_LABEL,
	APPEARANCE_SECTION,
	APPEARANCE_THEME_FIELD_ID,
	APPEARANCE_THEME_LABEL,
	APPEARANCE_THEME_NOTE,
	APPEARANCE_TITLE,
	APPEARANCE_UNKNOWN_THEME,
} from "@/constants/appearance";
import { INPUT_STYLE, LABEL_STYLE, SECTION_STYLE } from "@/constants/settingsUi";
import { DEFAULT_THEME_ID, FOLLOW_SYSTEM_THEME_ID } from "@/constants/theme";
import {
	activeTheme,
	listThemes,
	subscribeToActiveTheme,
	subscribeToThemes,
} from "@/theme/service";

/**
 * The Appearance section (M3.5, spec 030 §Theme service): the theme in force, by
 * name, chosen from the registry the built-in pair and a plugin's themes share.
 *
 * The control writes `settings.theme` through `updateSettings` — the single write
 * path, which persists the blob and applies the theme. It never calls
 * `applyTheme` itself, the same rule the typography section follows for fonts, so
 * a reload re-applies exactly what is stored and no component owns the root.
 *
 * The read-back is the service's, not the blob's: a plugin may put its own theme
 * in force through `themes.apply`, and the line should name what is *on screen*.
 *
 * The first choice is **Follow system** (M3.6): its value is the sentinel
 * `FOLLOW_SYSTEM_THEME_ID`, which the applier reads before the registry, so the
 * mode comes from `prefers-color-scheme` and the section holds no literal.
 */

const NOTE_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	margin: 0,
};

export function AppearanceSection() {
	const stored = useSettings().settings.theme;
	const themes = useSyncExternalStore(subscribeToThemes, listThemes);
	const active = useSyncExternalStore(subscribeToActiveTheme, activeTheme);
	// The stored choice (a theme id, or the follow-system sentinel), or the
	// built-in default the blob's `null` means.
	const chosen = stored ?? DEFAULT_THEME_ID;
	return (
		<section style={SECTION_STYLE} data-section={APPEARANCE_SECTION}>
			<h2>{APPEARANCE_TITLE}</h2>
			<label style={LABEL_STYLE} htmlFor={APPEARANCE_THEME_FIELD_ID}>
				{APPEARANCE_THEME_LABEL}
				<select
					id={APPEARANCE_THEME_FIELD_ID}
					style={INPUT_STYLE}
					value={chosen}
					onChange={(event) => {
						updateSettings({ theme: event.target.value });
					}}
				>
					<option value={FOLLOW_SYSTEM_THEME_ID}>{APPEARANCE_FOLLOW_SYSTEM_LABEL}</option>
					{themes.map((theme) => (
						<option key={theme.id} value={theme.id}>
							{theme.name}
						</option>
					))}
				</select>
			</label>
			<p style={NOTE_STYLE} role="status" data-theme-in-force={active?.id ?? ""}>
				{`${APPEARANCE_IN_FORCE_LABEL}: ${active?.name ?? APPEARANCE_UNKNOWN_THEME}`}
			</p>
			<p style={NOTE_STYLE}>{APPEARANCE_THEME_NOTE}</p>
		</section>
	);
}
