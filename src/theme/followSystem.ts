import { BUILTIN_THEME, DEFAULT_THEME_ID, FOLLOW_SYSTEM_MEDIA_QUERY } from "@/constants/theme";

/**
 * Following the system's appearance (M3.6, spec 030 §Theme service): the
 * `prefers-color-scheme` edge and the resolution out of it.
 *
 * The resolution is **pure** — a boolean in, a theme id out — so both directions
 * are unit-testable with no media query and no timers. Everything impure (the
 * query object and its `change` listener) sits at this edge, the way
 * `theme/service.ts` keeps `document` at its own; a window without a media API
 * follows the built-in dark default rather than landing light.
 */

/** The theme the system's appearance resolves to. Pure; no media query involved. */
export function resolveSystemTheme(matchesDark: boolean): string {
	return matchesDark ? BUILTIN_THEME.dark.id : BUILTIN_THEME.light.id;
}

/** The system's `prefers-color-scheme` list, or `null` where there is no media API. */
function mediaQuery(): MediaQueryList | null {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
	return window.matchMedia(FOLLOW_SYSTEM_MEDIA_QUERY);
}

/**
 * The theme the system asks for right now: the resolution above where the media
 * API exists, the built-in default where it does not — dark stays this app's own
 * default, so a window with no media API is never left light.
 */
export function systemThemeId(): string {
	const query = mediaQuery();
	return query === null ? DEFAULT_THEME_ID : resolveSystemTheme(query.matches);
}

/**
 * Watch the system's appearance; the returned function stops the watch. Where
 * there is no media API the system cannot flip, so the watch is inert.
 */
export function watchSystemAppearance(listener: (matchesDark: boolean) => void): () => void {
	const query = mediaQuery();
	if (query === null) return () => {};
	const onChange = (event: MediaQueryListEvent): void => {
		listener(event.matches);
	};
	query.addEventListener("change", onChange);
	return () => {
		query.removeEventListener("change", onChange);
	};
}

/** The watch while follow-system is in force, or `null` when it is not. */
let stop: (() => void) | null = null;

/**
 * Put the system's appearance in force through `apply`, and keep it in force:
 * the first call attaches the one watch (a second call reuses it), every flip
 * re-applies through the same `apply`. Returns the first application's result.
 */
export function followSystem(apply: (id: string) => boolean): boolean {
	stop ??= watchSystemAppearance((matchesDark) => {
		apply(resolveSystemTheme(matchesDark));
	});
	return apply(systemThemeId());
}

/** Stop watching; an explicit theme's apply, and the tests' reset, call this. */
export function stopFollowingSystem(): void {
	stop?.();
	stop = null;
}
