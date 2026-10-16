import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installNativeMenu } from "@/app/nativeMenu";
import { Providers } from "@/app/providers";
import { Shell } from "@/app/Shell";
import { restoreSettings } from "@/app/settings/store";
import { registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./theme/tokens.css";

registerTopnavBuiltins();

// Before the first render, so the restored tab strip, route, recent directories
// and font variables are in the first painted frame (spec 010 §Persistence,
// spec 030 §How a font is applied). Idempotent; the provider layer above the
// client is documented in `providers.tsx`.
restoreSettings();

// The menu the shell draws outside the page (M5.3). A browser build has no shell,
// so this is a no-op there; the subscription lives as long as the app does.
void installNativeMenu();

const root = document.getElementById("root");
if (!root) {
	throw new Error("src/main.tsx: root element not found in document");
}

createRoot(root).render(
	<StrictMode>
		<Providers>
			<OfflineBanner />
			<Shell />
		</Providers>
	</StrictMode>,
);
