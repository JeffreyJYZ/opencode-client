import { ROUTE_KIND } from "@/constants/routes";
import { PLACEHOLDER_STYLE } from "@/constants/styles";

/** The home surface. M1.2 replaces this body; spec 010 §Home page. */
export function HomePage() {
	return (
		<main data-route={ROUTE_KIND.home} style={PLACEHOLDER_STYLE}>
			{ROUTE_KIND.home}
		</main>
	);
}
