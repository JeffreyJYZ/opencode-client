import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installNativeMenu } from "@/app/nativeMenu";
import { Providers } from "@/app/providers";
import { restoreSettings } from "@/app/settings/store";
import { registerShellBuiltins } from "@/app/shellBuiltins";
import { registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Slot } from "@/components/Slot";
import { registerSidebarBuiltins } from "@/components/sidebar/builtinPanels";
import { SLOT_LOCKED } from "@/constants/slots";
import { startPluginManager } from "@/plugins/managerBoot";
import "./theme/tokens.css";

// The shell renders through the `app.substrate` slot (M4.17): it registers here,
// at boot, beside the other built-in registrants, so the first painted frame is
// the same frame the direct render gave — same components, same order.
registerShellBuiltins();
registerTopnavBuiltins();
registerSidebarBuiltins();

// Before the first render, so the restored tab strip, route, recent directories
// and font variables are in the first painted frame (spec 010 §Persistence,
// spec 030 §How a font is applied). Idempotent; the provider layer above the
// client is documented in `providers.tsx`.
restoreSettings();

// After the restore, so the manager reads the persisted records once and loads
// the plugins the user left enabled (M4.5). A refused load is a `PluginFault`,
// never a throw, so a bad record cannot stop the app booting.
startPluginManager();

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
			{/* The shell's place (M4.17): the registered built-in above renders
			    here, through the one slot a locked area is hosted at. */}
			<Slot id={SLOT_LOCKED.substrate} />
		</Providers>
	</StrictMode>,
);
