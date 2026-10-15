import { ConnectSection } from "@/components/ConnectSection";
import { ROUTE_KIND } from "@/constants/routes";
import { PLACEHOLDER_STYLE } from "@/constants/styles";

/**
 * The settings surface. M3.5 owns its sections and hierarchy; M1.7 contributes
 * the one section it needs — the connect flow — and nothing more (spec 010
 * §Routes, spec 050 §Target and auth).
 */
export function SettingsPage() {
	return (
		<main data-route={ROUTE_KIND.settings} style={PLACEHOLDER_STYLE}>
			<ConnectSection />
		</main>
	);
}
