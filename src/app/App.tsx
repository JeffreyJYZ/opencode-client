import { currentPath, pathToRoute } from "@/app/router";
import { useRegisteredRoute, useRoute } from "@/app/useRoute";
import { ROUTE_KIND } from "@/constants/routes";
import { HomePage } from "@/pages/HomePage";
import { SessionPage } from "@/pages/SessionPage";
import { SettingsPage } from "@/pages/SettingsPage";

/**
 * The route switch (spec 010 §Routes).
 *
 * Built-in routes win: a registered contribution serves only paths the built-in
 * router does not (M0.4b), so a plugin can never shadow `/settings` (the route
 * to its own manager). M1.1/M1.4 wrap this in the shell's nav and tab strip;
 * the switch itself stays this small.
 */
export function App() {
	const route = useRoute();
	const registered = useRegisteredRoute();
	if (registered !== null && pathToRoute(currentPath()) === null) return <registered.component />;
	switch (route.kind) {
		case ROUTE_KIND.session:
			return <SessionPage id={route.id} />;
		case ROUTE_KIND.settings:
			return <SettingsPage />;
		case ROUTE_KIND.home:
			return <HomePage />;
	}
}
