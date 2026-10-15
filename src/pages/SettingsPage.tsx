import { useSettingsSections } from "@/app/settings/sections";
import { ROUTE_KIND } from "@/constants/routes";
import { PLACEHOLDER_STYLE } from "@/constants/styles";

/**
 * The settings surface (spec 010 §Routes). M3.5 owns its hierarchy; M1.6 makes it
 * render **from the section registry** so this view and the command palette read
 * one list — a section registered for the surface is listed by the palette too.
 */
export function SettingsPage() {
	const sections = useSettingsSections();
	return (
		<main data-route={ROUTE_KIND.settings} style={PLACEHOLDER_STYLE}>
			{sections.map(({ id, component: Section }) => (
				<Section key={id} />
			))}
		</main>
	);
}
