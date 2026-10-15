import { useRegisteredRoute, useRoute } from "@/app/useRoute";
import { ROUTE_KIND } from "@/constants/routes";
import { HomePage } from "@/pages/HomePage";
import { SessionPage } from "@/pages/SessionPage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * The route switch (spec 010 §Routes).
 *
 * A registered route wins over the built-in switch, so a contribution can serve
 * a path the router does not know — and, deliberately, replace one it does.
 * M1.1/M1.4 wrap this in the shell's nav and tab strip; the switch itself stays
 * this small.
 */
export function App() {
	const route = useRoute();
	const registered = useRegisteredRoute();
	if (registered !== null) return <registered.component />;
	switch (route.kind) {
		case ROUTE_KIND.session:
			return <SessionPage id={route.id} />;
		case ROUTE_KIND.settings:
			return <SettingsPage />;
		case ROUTE_KIND.home:
			return <HomePage />;
	}
}
