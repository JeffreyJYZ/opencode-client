import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/providers";
import { Shell } from "@/app/Shell";
import { registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { OfflineBanner } from "@/components/OfflineBanner";
import "./theme/tokens.css";

registerTopnavBuiltins();

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
