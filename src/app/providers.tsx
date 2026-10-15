import type { ReactNode } from "react";
import { ClientProvider } from "@/session/ClientProvider";

/**
 * The single composition point for app-wide providers (M1.5, M3.4 plug in here).
 *
 * Intended order, outermost first, each wrapping the next:
 *
 * 1. **theme** — the `data-theme` marker and the font variables must exist before
 *    any surface reads a token (M3.4).
 * 2. **settings** — the versioned settings blob; the client resolves its target
 *    from it, so it must sit above the client (M1.5).
 * 3. **client** — the opencode client and its offline state (M0.5), which is the
 *    one provider that exists so far.
 *
 * A context adds no DOM: the children still render exactly as they did, so the
 * seam stays invisible until something actually needs the client.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
	return <ClientProvider>{children}</ClientProvider>;
}
