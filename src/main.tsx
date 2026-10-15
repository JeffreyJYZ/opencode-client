import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { Providers } from "@/app/providers";
import "./theme/tokens.css";

const root = document.getElementById("root");
if (!root) {
	throw new Error("src/main.tsx: root element not found in document");
}

createRoot(root).render(
	<StrictMode>
		<Providers>
			<App />
		</Providers>
	</StrictMode>,
);
