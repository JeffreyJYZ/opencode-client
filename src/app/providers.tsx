import type { ReactNode } from "react";
import { SettingsNotice } from "@/components/SettingsNotice";
import { ClientProvider } from "@/session/ClientProvider";

/**
 * The single composition point for app-wide providers (M3.4 plugs in here).
 *
 * Intended order, outermost first, each wrapping the next:
 *
 * 1. **theme** — the `data-theme` marker and the font variables must exist before
 *    any surface reads a token (M3.4).
 * 2. **settings** — the versioned settings blob. It is *restored* by
 *    `restoreSettings()` in `main.tsx`, **before the first render**, so nothing
 *    paints an empty shell and no font change flashes; this layer is the blob's
 *    visible surface (the notice) and it sits above the client, because the
 *    client resolves its target from the blob (M1.7).
 * 3. **client** — the opencode client and its offline state (M0.5).
 *
 * A context adds no DOM: the children still render exactly as they did, so the
 * seam stays invisible until something actually needs the client.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
	return (
		<>
			<SettingsNotice />
			<ClientProvider>{children}</ClientProvider>
		</>
	);
}
