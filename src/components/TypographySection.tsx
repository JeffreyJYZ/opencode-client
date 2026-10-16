import type { CSSProperties } from "react";
import { updateSettings } from "@/app/settings/store";
import { useSettings } from "@/app/settings/useSettings";
import { FONT_ROLE } from "@/constants/settings";
import { BUTTON_STYLE, INPUT_STYLE, LABEL_STYLE, SECTION_STYLE } from "@/constants/settingsUi";
import {
	PX_UNIT,
	TYPOGRAPHY_FALLBACK_NOTE,
	TYPOGRAPHY_FIELD_ID,
	TYPOGRAPHY_RESET_TEXT,
	TYPOGRAPHY_ROLE_LABEL,
	TYPOGRAPHY_SAMPLE_CLASS,
	TYPOGRAPHY_SAMPLE_LABEL,
	TYPOGRAPHY_SAMPLE_TEXT,
	TYPOGRAPHY_SECTION,
	TYPOGRAPHY_TITLE,
} from "@/constants/typography";
import {
	clampFontSize,
	DEFAULT_FONTS,
	type FontPreferences,
	type FontRole,
	type FontRolePreference,
	fontSizeBounds,
} from "@/theme/fonts";

/**
 * The typography section (M3.2): both roles' family and size, one live sample
 * per role, a reset, all persisted in the settings blob and applied live.
 *
 * The controls write through `updateSettings`, which is the single write path
 * and the thing that re-applies the fonts to the root — a component never calls
 * `applyFonts` itself. The sample's family comes from a `base.css` class, because
 * a component may not name a family (the font guard in `theme/fontGuard.test.ts`).
 */

const ROW_STYLE: CSSProperties = {
	display: "flex",
	gap: "var(--oc-space-3)",
	flexWrap: "wrap",
	alignItems: "flex-start",
};

const SAMPLE_BLOCK_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	flex: "1 1 20rem",
	minWidth: 0,
};

const SAMPLE_STYLE: CSSProperties = {
	margin: 0,
	padding: "var(--oc-space-2)",
	background: "var(--oc-surface-raised)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	overflowWrap: "anywhere",
};

const CAPTION_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
};

const NOTE_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	margin: 0,
};

/** One role's two controls and its live sample. */
function RoleControls({ role, fonts }: { role: FontRole; fonts: FontPreferences }) {
	const preference = fonts[role];
	const labels = TYPOGRAPHY_ROLE_LABEL[role];
	const ids = TYPOGRAPHY_FIELD_ID[role];
	const { min, max } = fontSizeBounds(role);
	const patch = (next: Partial<FontRolePreference>): void => {
		updateSettings({ fonts: { ...fonts, [role]: { ...preference, ...next } } });
	};
	return (
		<div style={ROW_STYLE}>
			<label style={LABEL_STYLE} htmlFor={ids.family}>
				{labels.family}
				<input
					id={ids.family}
					style={INPUT_STYLE}
					value={preference.family}
					autoComplete="off"
					onChange={(event) => patch({ family: event.target.value })}
				/>
			</label>
			<div style={LABEL_STYLE}>
				<label htmlFor={ids.size}>{`${labels.size} (${PX_UNIT})`}</label>
				<input
					id={ids.size}
					style={INPUT_STYLE}
					type="range"
					min={min}
					max={max}
					step={1}
					value={preference.size}
					onChange={(event) =>
						patch({ size: clampFontSize(role, Number(event.target.value)) })
					}
				/>
				<output htmlFor={ids.size}>{`${preference.size}${PX_UNIT}`}</output>
			</div>
			<div style={SAMPLE_BLOCK_STYLE}>
				<span style={CAPTION_STYLE}>{TYPOGRAPHY_SAMPLE_LABEL[role]}</span>
				<p
					className={TYPOGRAPHY_SAMPLE_CLASS[role]}
					style={SAMPLE_STYLE}
					data-sample={role}
				>
					{TYPOGRAPHY_SAMPLE_TEXT}
				</p>
			</div>
		</div>
	);
}

export function TypographySection() {
	const fonts = useSettings().settings.fonts;
	return (
		<section style={SECTION_STYLE} data-section={TYPOGRAPHY_SECTION}>
			<h2>{TYPOGRAPHY_TITLE}</h2>
			<RoleControls role={FONT_ROLE.ui} fonts={fonts} />
			<RoleControls role={FONT_ROLE.code} fonts={fonts} />
			<p style={NOTE_STYLE}>{TYPOGRAPHY_FALLBACK_NOTE}</p>
			<button
				type="button"
				style={BUTTON_STYLE}
				onClick={() => {
					updateSettings({ fonts: DEFAULT_FONTS });
				}}
			>
				{TYPOGRAPHY_RESET_TEXT}
			</button>
		</section>
	);
}
