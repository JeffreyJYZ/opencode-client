import { useRoute } from "@/app/useRoute";
import { ROUTE_KIND } from "@/constants/routes";

/**
 * The session the current route names, or `null` on home/settings (M2.7/M2.8).
 *
 * The shell chrome — the sidebar and the statusline — is a function of the open
 * session, and the route is the one truth for "which session is open"; a
 * component that read the tab strip instead would disagree with the URL the
 * moment a registered route served a session-shaped path.
 */
export function useActiveSessionId(): string | null {
	const route = useRoute();
	return route.kind === ROUTE_KIND.session ? route.id : null;
}
