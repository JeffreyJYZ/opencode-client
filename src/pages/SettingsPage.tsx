import { ROUTE_KIND } from "@/constants/routes";
import { PLACEHOLDER_STYLE } from "@/constants/styles";

/** The settings surface. M3.5 replaces this body; spec 010 §Routes. */
export function SettingsPage() {
	return (
		<main data-route={ROUTE_KIND.settings} style={PLACEHOLDER_STYLE}>
			{ROUTE_KIND.settings}
		</main>
	);
}
