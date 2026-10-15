import { ROUTE_KIND } from "@/constants/routes";
import { PLACEHOLDER_STYLE } from "@/constants/styles";

/**
 * The session surface. M2.1/M2.2 replace this body; spec 010 §Routes.
 *
 * An unknown or child session id renders this same "no session" state — the
 * router carries the id and M2 decides what to fetch, so M0.4 names it and no more.
 */
export function SessionPage({ id }: { readonly id: string }) {
	return (
		<main data-route={ROUTE_KIND.session} style={PLACEHOLDER_STYLE}>
			{`${ROUTE_KIND.session} ${id}`}
		</main>
	);
}
