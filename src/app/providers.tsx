import type { ReactNode } from "react";

/**
 * The single composition point for app-wide providers (M0.5, M1.5 plug in here).
 *
 * Intended order, outermost first, each wrapping the next:
 *
 * 1. **theme** — the `data-theme` marker and the font variables must exist before
 *    any surface reads a token (M3.4).
 * 2. **settings** — the versioned settings blob; the client resolves its target
 *    from it, so it must sit above the client (M1.5).
 * 3. **client** — the opencode client and its offline state (M0.5).
 *
 * It composes nothing yet on purpose: no task has a provider to plug in, and a
 * placeholder context would be a second thing to delete. The children are
 * returned unchanged, so the seam exists without inventing a wrapper around them.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
	return children;
}
