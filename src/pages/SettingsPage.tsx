import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { useSettingsSections } from "@/app/settings/sections";
import { closeSettingsSurface } from "@/app/tabSync";
import { SettingsSectionBoundary } from "@/components/SettingsSectionBoundary";
import { Slot } from "@/components/Slot";
import { KEY_ESCAPE } from "@/constants/keys";
import { ROUTE_KIND } from "@/constants/routes";
import { SECTION_HEADING_STYLE, SURFACE_STYLE } from "@/constants/settingsUi";
import { SLOT } from "@/constants/slots";
import { SETTINGS_TAB_LABEL } from "@/constants/tabs";

/**
 * The settings surface (spec 010 §Routes): **a view that renders as a tab while
 * it is open**, never an entry of its own in the nav. It is reached by the four
 * entries — the nav gear, ⌘,, the home page's button and the palette — all of
 * which open, or focus, this one tab: the tab store is idempotent, so a second
 * press activates the open tab instead of adding a second.
 *
 * The surface knows no section by name. It renders the registry in registry
 * order, each section inside its own boundary, so a section that throws is inert
 * plus a logged fault while the others keep rendering (M3.5 requirement 5). It
 * also renders the section's **registered title** (M4.11): the heading is the
 * registry's `label`, drawn by the host, so a plugin section shows its own title
 * and a section body never repeats it. The heading sits **inside** the boundary,
 * so a section that throws takes its heading down with it rather than leaving an
 * empty one behind.
 *
 * Focus enters the surface when it opens, so Tab reaches the first control
 * without a click; Escape leaves it by closing the tab — the same move ⌘W makes,
 * because this is a view, not a modal overlay. Focus is programmatic
 * (`tabIndex={-1}`), so the surface itself is never a Tab stop.
 */
export function SettingsPage() {
	const sections = useSettingsSections();
	const surfaceRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		surfaceRef.current?.focus();
	}, []);

	const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
		if (event.key !== KEY_ESCAPE) return;
		event.preventDefault();
		closeSettingsSurface();
	};

	return (
		<main
			ref={surfaceRef}
			tabIndex={-1}
			aria-label={SETTINGS_TAB_LABEL}
			data-route={ROUTE_KIND.settings}
			style={SURFACE_STYLE}
			onKeyDown={onKeyDown}
		>
			{sections.map(({ id, label, component: Section }) => (
				<SettingsSectionBoundary key={id} id={id}>
					<h2 style={SECTION_HEADING_STYLE}>{label}</h2>
					<Section />
				</SettingsSectionBoundary>
			))}
			{/* After every registered section (M4.12): an empty slot adds no node. */}
			<Slot id={SLOT.settingsSections} />
		</main>
	);
}
